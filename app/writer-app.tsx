'use client';
/* oxlint-disable react/react-compiler, next/no-html-link-for-pages, jsx-a11y/no-static-element-interactions, jsx-a11y/label-has-associated-control, jsx-a11y/control-has-associated-label -- Dialog backdrop and compound settings rows are labelled by their visible content. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Focus,
  Gauge,
  Import,
  Languages,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  SpellCheck2,
  WandSparkles,
  X,
} from 'lucide-react';
import { createWriterRuntime, type WriterRuntime } from '@/lib/writer-runtime';
import { stableTextHash } from '@/lib/analyzers';
import {
  ASSISTANT_ENGINES,
  LANGUAGE_PROFILES,
  type AssistantEngineId,
  type AssistantReply,
  type LanguageProfileId,
  type LexiconResult,
  type WriterFinding,
  type WriterReport,
} from '@/lib/writer-types';
import { Brand } from './brand';

const sample = `The launch note is almost ready. In order to make the message more clear, we should review the longer sections and remove any private contact details before sharing it with the broader team.\n\nQuestions can be sent to editor@example.com.`;
type DocumentRecord = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};
type ReviewTab = 'suggestions' | 'words' | 'assistant';
type MobileDrawer = 'library' | 'review' | null;
type Status = 'ready' | 'analyzing' | 'error';
type AssistantMessage = {
  role: 'user' | 'assistant';
  text: string;
  supported?: boolean;
  reply?: AssistantReply;
};
const makeDocument = (body = '', title = 'Untitled draft'): DocumentRecord => ({
  id: crypto.randomUUID(),
  title,
  body,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

function applyChanges(text: string, findings: WriterFinding[]) {
  return findings
    .filter((item) => item.range && item.suggestion?.safeToApply)
    .sort((a, b) => b.range!.start - a.range!.start)
    .reduce(
      (current, item) =>
        current.slice(0, item.range!.start) +
        item.suggestion!.replacement +
        current.slice(item.range!.end),
      text,
    );
}

function FindingIcon({ category }: { category: WriterFinding['category'] }) {
  if (category === 'privacy') return <ShieldCheck />;
  if (category === 'language') return <Languages />;
  if (category === 'readability') return <Gauge />;
  if (category === 'spelling') return <SpellCheck2 />;
  return <PenLine />;
}

export default function WriterApp() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeId, setActiveId] = useState('');
  const [profileId, setProfileId] = useState<LanguageProfileId>('eld-small');
  const [assistantEngine, setAssistantEngine] =
    useState<AssistantEngineId>('structured');
  const [runtime, setRuntime] = useState<WriterRuntime>();
  const [report, setReport] = useState<WriterReport>();
  const [status, setStatus] = useState<Status>('ready');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ReviewTab>('suggestions');
  const [mobileDrawer, setMobileDrawer] = useState<MobileDrawer>(null);
  const [settings, setSettings] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState(false);
  const [saved, setSaved] = useState(true);
  const [lookup, setLookup] = useState('');
  const [lexicon, setLexicon] = useState<LexiconResult>();
  const [lookupBusy, setLookupBusy] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      text: 'I can summarize this draft, retrieve its key passages, build an outline, explain review evidence, and prepare supported edits.',
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState('Ready');
  const [assistantProgress, setAssistantProgress] = useState<number>();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const assistantController = useRef<AbortController | undefined>(undefined);
  const active = documents.find((item) => item.id === activeId) ?? documents[0];
  const draft = active?.body ?? '';

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator)
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const stored = localStorage.getItem('invariant:documents');
    let restored: DocumentRecord[] = [];
    try {
      restored = stored ? (JSON.parse(stored) as DocumentRecord[]) : [];
    } catch {
      restored = [];
    }
    if (!restored.length) restored = [makeDocument(sample, 'Launch note')];
    setDocuments(restored);
    setActiveId(localStorage.getItem('invariant:active') ?? restored[0].id);
    const storedProfile = localStorage.getItem(
      'invariant:language-profile',
    ) as LanguageProfileId | null;
    if (LANGUAGE_PROFILES.some((item) => item.id === storedProfile))
      setProfileId(storedProfile!);
    const storedAssistant = localStorage.getItem(
      'invariant:assistant-engine',
    ) as AssistantEngineId | null;
    if (
      ASSISTANT_ENGINES.some((item) => item.id === storedAssistant) &&
      (storedAssistant === 'structured' || 'gpu' in navigator)
    )
      setAssistantEngine(storedAssistant!);
    setAutoCorrect(localStorage.getItem('invariant:auto-correct') === 'true');
  }, []);
  useEffect(() => {
    const next = createWriterRuntime(profileId, assistantEngine, (event) => {
      if (event.leanletId !== 'writer.generate-smollm2-360m') return;
      if (event.type === 'diagnostic') {
        const value = event.detail.progress;
        setAssistantProgress(typeof value === 'number' ? value : undefined);
        setAssistantStatus(
          typeof event.detail.status === 'string'
            ? event.detail.status
            : 'Loading local model',
        );
      } else if (event.type === 'loaded') {
        setAssistantProgress(100);
        setAssistantStatus('Local model ready');
      } else if (event.type === 'failed') {
        setAssistantStatus('Local model unavailable');
      }
    });
    setRuntime(next);
    setReport(undefined);
    setError('');
    localStorage.setItem('invariant:language-profile', profileId);
    localStorage.setItem('invariant:assistant-engine', assistantEngine);
    setAssistantStatus(
      assistantEngine === 'structured'
        ? 'Document tools ready'
        : 'Loads on first request',
    );
    setAssistantProgress(undefined);
    return () => {
      controller.current?.abort();
      assistantController.current?.abort();
      void next.destroy();
    };
  }, [profileId, assistantEngine]);
  useEffect(() => {
    if (!documents.length) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem('invariant:documents', JSON.stringify(documents));
      localStorage.setItem('invariant:active', activeId);
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [documents, activeId]);
  useEffect(() => { localStorage.setItem('invariant:auto-correct', String(autoCorrect)); }, [autoCorrect]);

  const updateActive = useCallback(
    (patch: Partial<DocumentRecord>) =>
      setDocuments((items) =>
        items.map((item) =>
          item.id === activeId
            ? { ...item, ...patch, updatedAt: Date.now() }
            : item,
        ),
      ),
    [activeId],
  );
  const createDraft = () => {
    const item = makeDocument();
    setDocuments((items) => [item, ...items]);
    setActiveId(item.id);
    setReport(undefined);
    setMobileDrawer(null);
  };
  const reviewAndReveal = async () => {
    setMobileDrawer('review');
    await runAnalysis();
  };
  const runAnalysis = useCallback(async () => {
    if (!runtime || !draft.trim()) {
      setReport(undefined);
      return;
    }
    controller.current?.abort();
    controller.current = new AbortController();
    setStatus('analyzing');
    setError('');
    try {
      const next = await runtime.analyze(draft, controller.current.signal);
      if (controller.current.signal.aborted) return;
      setReport(next);
      setStatus('ready');
      if (autoCorrect) {
        const corrected = applyChanges(
          draft,
          next.findings.filter((item) =>
            ['grammar', 'style'].includes(item.category),
          ),
        );
        if (corrected !== draft) updateActive({ body: corrected });
      }
    } catch (caught) {
      if (!controller.current?.signal.aborted) {
        setStatus('error');
        setError(
          caught instanceof Error ? caught.message : 'Local review failed.',
        );
      }
    }
  }, [runtime, draft, autoCorrect, updateActive]);
  useEffect(() => {
    if (!runtime || draft.trim().length < 8) return;
    const timer = window.setTimeout(() => void runAnalysis(), 800);
    return () => window.clearTimeout(timer);
  }, [runtime, draft, runAnalysis]);

  const words = useMemo(
    () => (draft.trim() ? draft.trim().split(/\s+/).length : 0),
    [draft],
  );
  const safeCount =
    report?.findings.filter((item) => item.suggestion?.safeToApply).length ?? 0;
  const lookupWord = async (word = lookup) => {
    if (!runtime || !word.trim()) return;
    setLookupBusy(true);
    setTab('words');
    try {
      setLexicon(await runtime.lookupWord(word));
    } finally {
      setLookupBusy(false);
    }
  };
  const selectWord = () => {
    const editor = textareaRef.current;
    if (!editor) return;
    const selected = draft
      .slice(editor.selectionStart, editor.selectionEnd)
      .trim()
      .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
    if (selected && !selected.includes(' ')) {
      setLookup(selected);
      void lookupWord(selected);
    }
  };
  const applyFinding = (
    finding: WriterFinding,
    replacement = finding.suggestion?.replacement,
  ) => {
    if (!finding.range || !replacement) return;
    updateActive({
      body:
        draft.slice(0, finding.range.start) +
        replacement +
        draft.slice(finding.range.end),
    });
  };
  const ask = async (prompt?: string) => {
    const question = (prompt ?? assistantInput).trim();
    if (!question || !runtime || !draft.trim() || assistantBusy) return;
    setMessages((items) => [...items, { role: 'user', text: question }]);
    setAssistantInput('');
    setAssistantBusy(true);
    setAssistantStatus(
      assistantEngine === 'structured' ? 'Reading this draft' : 'Preparing local model',
    );
    assistantController.current?.abort();
    assistantController.current = new AbortController();
    try {
      const currentReport = await runtime.analyze(
        draft,
        assistantController.current.signal,
      );
      setReport(currentReport);
      const selectedText =
        selection.end > selection.start
          ? draft.slice(selection.start, selection.end)
          : undefined;
      const reply = await runtime.ask(
        {
          question,
          text: draft,
          report: currentReport,
          selection: selectedText
            ? { ...selection, text: selectedText }
            : undefined,
          history: messages
            .slice(-6)
            .map((message) => ({ role: message.role, content: message.text })),
        },
        assistantController.current.signal,
      );
      setMessages((items) => [
        ...items,
        {
          role: 'assistant',
          text: reply.answer,
          supported: reply.supported,
          reply,
        },
      ]);
      setAssistantStatus(
        assistantEngine === 'structured'
          ? 'Document tools ready'
          : 'Local model ready',
      );
    } catch (caught) {
      if (!assistantController.current.signal.aborted) {
        const text =
          caught instanceof Error
            ? caught.message
            : 'The local assistant could not finish this request.';
        setMessages((items) => [
          ...items,
          { role: 'assistant', text, supported: false },
        ]);
        setAssistantStatus('Assistant unavailable');
      }
    } finally {
      setAssistantBusy(false);
    }
  };
  const applyAssistantReply = (reply: AssistantReply) => {
    if (
      !reply.replacement ||
      !reply.range ||
      reply.basisHash !== stableTextHash(draft)
    )
      return;
    updateActive({
      body:
        draft.slice(0, reply.range.start) +
        reply.replacement +
        draft.slice(reply.range.end),
    });
    setSelection({ start: 0, end: 0 });
  };
  const exportDraft = () => {
    const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(active?.title || 'draft').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importDraft = async (file?: File) => {
    if (!file) return;
    const item = makeDocument(
      await file.text(),
      file.name.replace(/\.(md|txt)$/i, ''),
    );
    setDocuments((items) => [item, ...items]);
    setActiveId(item.id);
  };

  return (
    <main className={`desk ${focusMode ? 'focus-mode' : ''}`}>
      <header className="desk-top">
        <a href={`${base}/`} aria-label="Invariant home">
          <Brand inverse />
        </a>
        <div className="desk-document-state">
          <span>
            {saved ? (
              <>
                <Check /> Saved on this device
              </>
            ) : (
              'Saving…'
            )}
          </span>
          <i />
        </div>
        <div className="desk-actions">
          <button className="mobile-only" title="Documents" onClick={() => setMobileDrawer('library')}>
            <BookOpen />
          </button>
          <button className="mobile-only" title="Review and assistant" onClick={() => setMobileDrawer('review')}>
            <Gauge />
          </button>
          <button
            title="Focus mode"
            onClick={() => setFocusMode((value) => !value)}
          >
            <Focus />
          </button>
          <button title="Settings" onClick={() => setSettings(true)}>
            <Settings2 />
          </button>
          <a href={`${base}/`} title="Leave writing desk">
            <ArrowLeft />
          </a>
        </div>
      </header>
      {mobileDrawer ? (
        <button
          className="mobile-drawer-backdrop"
          aria-label="Close drawer"
          onClick={() => setMobileDrawer(null)}
        />
      ) : null}
      <div className="desk-grid">
        <aside className={`library ${mobileDrawer === 'library' ? 'drawer-open' : ''}`}>
          <div className="mobile-drawer-head">
            <strong>Documents</strong>
            <button aria-label="Close documents" onClick={() => setMobileDrawer(null)}><X /></button>
          </div>
          <button className="new-document" onClick={createDraft}>
            <FilePlus2 /> New document
          </button>
          <p className="desk-label">LIBRARY</p>
          <div className="document-list">
            {[...documents]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((item) => (
                <button
                  key={item.id}
                  className={item.id === activeId ? 'active' : ''}
                  onClick={() => {
                    setActiveId(item.id);
                    setReport(undefined);
                    setMobileDrawer(null);
                  }}
                >
                  <FileText />
                  <span>
                    <strong>{item.title || 'Untitled draft'}</strong>
                    <small>
                      {item.body.trim()
                        ? `${item.body.trim().split(/\s+/).length} words`
                        : 'Empty'}
                    </small>
                  </span>
                </button>
              ))}
          </div>
          <div className="library-bottom">
            <button onClick={() => importRef.current?.click()}>
              <Import /> Import .txt or .md
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              hidden
              onChange={(event) => void importDraft(event.target.files?.[0])}
            />
            <p>
              <LockKeyhole /> Drafts are stored in this browser. Clearing site
              data removes them; export important work.
            </p>
          </div>
        </aside>
        <section className="writing-surface">
          <div className="writing-head">
            <div>
              <input
                aria-label="Document title"
                value={active?.title ?? ''}
                onChange={(event) =>
                  updateActive({ title: event.target.value })
                }
              />
              <span>
                {words} words · {report?.readingMinutes ?? (words ? 1 : 0)} min
                read
              </span>
            </div>
            <div>
              <button
                onClick={() => void navigator.clipboard.writeText(draft)}
                title="Copy"
              >
                <Copy />
              </button>
              <button onClick={exportDraft} title="Export">
                <Download />
              </button>
              <button
                className="review-button"
              onClick={() => void reviewAndReveal()}
                disabled={status === 'analyzing'}
              >
                {status === 'analyzing' ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <Play />
                )}{' '}
                Review <kbd>⌘↵</kbd>
              </button>
            </div>
          </div>
          <div className="paper">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => updateActive({ body: event.target.value })}
              onDoubleClick={selectWord}
              onSelect={(event) =>
                setSelection({
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                })
              }
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void runAnalysis();
                }
              }}
              spellCheck={false}
              placeholder="Begin here…"
              aria-label="Writing editor"
            />
            <footer>
              <span>
                {report?.language.language ?? 'Language pending'}
                {report?.language.reliable === false ? ' · low confidence' : ''}
              </span>
              <span className={status}>
                {status === 'analyzing'
                  ? 'Reviewing locally'
                  : status === 'error'
                    ? 'Review unavailable'
                    : report
                      ? `Reviewed · ${report.findings.length} findings`
                      : 'Ready'}
              </span>
            </footer>
          </div>
        </section>
      <aside className={`inspector ${mobileDrawer === 'review' ? 'drawer-open' : ''}`}>
          <div className="mobile-drawer-head">
            <strong>Review</strong>
            <button aria-label="Close review" onClick={() => setMobileDrawer(null)}><X /></button>
          </div>
          <div className="inspector-head">
            <div>
              <p className="desk-label">DRAFT REVIEW</p>
              <h2>
                {report ? 'Evidence, not authorship.' : 'A quiet second look.'}
              </h2>
            </div>
            <div className="draft-score">
              <strong>{report?.scores.overall ?? '—'}</strong>
              <small>Draft score</small>
            </div>
          </div>
          <div className="inspector-tabs" role="tablist">
            <button
              className={tab === 'suggestions' ? 'active' : ''}
              onClick={() => setTab('suggestions')}
            >
              Review {report ? <span>{report.findings.length}</span> : null}
            </button>
            <button
              className={tab === 'words' ? 'active' : ''}
              onClick={() => setTab('words')}
            >
              Words
            </button>
            <button
              className={tab === 'assistant' ? 'active' : ''}
              onClick={() => setTab('assistant')}
            >
              Assistant
            </button>
          </div>
          {tab === 'suggestions' && (
            <div className="inspector-body">
              {!report && status !== 'error' ? (
                <div className="review-empty">
                  <PenLine />
                  <h3>
                    {status === 'analyzing'
                      ? 'Reading the draft…'
                      : 'No review yet'}
                  </h3>
                  <p>
                    Invariant checks spelling, clarity, privacy, and language
                    using scoped capabilities in this browser.
                  </p>
                  <button
                    onClick={() => void reviewAndReveal()}
                    disabled={!draft.trim() || status === 'analyzing'}
                  >
                    Run local review
                  </button>
                </div>
              ) : null}
              {error ? (
                <div className="review-error">
                  <AlertTriangle />
                  <strong>Review stopped</strong>
                  <p>{error}</p>
                </div>
              ) : null}
              {report ? (
                <>
                  <div className="score-grid">
                    <span>
                      <strong>{report.scores.correctness ?? '—'}</strong>Correctness
                    </span>
                    <span>
                      <strong>{report.scores.clarity}</strong>Clarity
                    </span>
                    <span>
                      <strong>{report.scores.privacy}</strong>Privacy
                    </span>
                  </div>
                  <p className="score-note">
                    Scores summarize configured checks; they do not measure
                    literary quality.
                  </p>
                {report.language.reliable === false ? (
                    <div className="quality-warning">
                      <AlertTriangle />
                      <span>
                        <strong>Language result needs confirmation</strong>
                        {report.language.warning}
                      </span>
                    </div>
                ) : null}
                {report.language.reliable && report.language.code !== 'en' ? (
                  <div className="quality-warning">
                    <AlertTriangle />
                    <span>
                      <strong>Some checks abstained</strong>
                      English spelling and word-reference packs are not applied to {report.language.language}. Language, privacy, and structural clarity checks remain active.
                    </span>
                  </div>
                ) : null}
                  {safeCount ? (
                    <button
                      className="apply-safe"
                      onClick={() =>
                        updateActive({
                          body: applyChanges(draft, report.findings),
                        })
                      }
                    >
                      <WandSparkles /> Apply {safeCount} exact{' '}
                      {safeCount === 1 ? 'fix' : 'fixes'}
                    </button>
                  ) : null}
                  <div className="finding-list">
                    {report.findings.length ? (
                      report.findings.map((finding) => (
                        <article
                          className={`finding ${finding.severity}`}
                          key={finding.id}
                        >
                          <FindingIcon category={finding.category} />
                          <div>
                            <p>
                              <span>{finding.category}</span>
                              {finding.confidence === null
                                ? 'dictionary match'
                                : `${Math.round(finding.confidence * 100)}% signal`}
                            </p>
                            <strong>{finding.title}</strong>
                            <small>{finding.explanation}</small>
                            {finding.suggestion ? (
                              <div className="replacement-list">
                                {(
                                  finding.suggestion.alternatives ?? [
                                    finding.suggestion.replacement,
                                  ]
                                )
                                  .slice(0, 3)
                                  .map((choice) => (
                                    <button
                                      key={choice}
                                      onClick={() =>
                                        applyFinding(finding, choice)
                                      }
                                    >
                                      {choice}
                                    </button>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="clean-review">
                        <CheckCircle2 />
                        <strong>No configured signals found</strong>
                        <p>
                          This is a clean result for the active checks, not a
                          guarantee that the draft is error-free.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
          {tab === 'words' && (
            <div className="inspector-body word-reference">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookupWord();
                }}
              >
                <input
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="Look up a word"
                  aria-label="Word to look up"
                />
                <button aria-label="Search word">
                  <Search />
                </button>
              </form>
              <p className="word-hint">
                <BookOpen /> Double-click a word in the editor to look it up.
              </p>
              {lookupBusy ? (
                <LoaderCircle className="spin word-loader" />
              ) : lexicon ? (
                lexicon.found ? (
                  <div className="lexicon-result">
                    <div>
                      <h3>{lexicon.word}</h3>
                      <span>{lexicon.source}</span>
                    </div>
                    {lexicon.senses.map((sense, index) => (
                      <article key={`${sense.partOfSpeech}-${index}`}>
                        <em>
                          {
                            {
                              n: 'noun',
                              v: 'verb',
                              a: 'adjective',
                              r: 'adverb',
                            }[sense.partOfSpeech]
                          }
                        </em>
                        <p>{sense.definition}</p>
                        {sense.synonyms.length ? (
                          <div>
                            <strong>Synonyms</strong>
                            <span>
                              {sense.synonyms.slice(0, 8).map((word) => (
                                <button
                                  key={word}
                                  onClick={() => {
                                    setLookup(word);
                                    void lookupWord(word);
                                  }}
                                >
                                  {word}
                                </button>
                              ))}
                            </span>
                          </div>
                        ) : null}
                        {sense.antonyms.length ? (
                          <div>
                            <strong>Antonyms</strong>
                            <span>
                              {sense.antonyms.slice(0, 8).map((word) => (
                                <button
                                  key={word}
                                  onClick={() => {
                                    setLookup(word);
                                    void lookupWord(word);
                                  }}
                                >
                                  {word}
                                </button>
                              ))}
                            </span>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="word-empty">
                    No local WordNet entry was found for “{lexicon.word}”.
                  </div>
                )
              ) : (
                <div className="word-empty">
                  Definitions, synonyms, and antonyms load only when requested.
                </div>
              )}
            </div>
          )}
          {tab === 'assistant' && (
            <div className="inspector-body assistant">
              <div className="assistant-boundary">
                <LockKeyhole />
                <span>
                  <strong>{assistantStatus}</strong>
                  {assistantEngine === 'structured'
                    ? 'Answers use this draft and its local review.'
                    : 'The model runs here. Draft text is not uploaded.'}
                </span>
              </div>
              {assistantProgress !== undefined && assistantBusy ? (
                <div className="assistant-progress" aria-label="Model loading progress">
                  <i style={{ width: `${Math.max(2, assistantProgress)}%` }} />
                </div>
              ) : null}
              <div className="assistant-actions" aria-label="Writing assistant actions">
                <button onClick={() => void ask('Summarize this draft')}>Summarize</button>
                <button onClick={() => void ask('Suggest the most useful edits')}>Suggest edits</button>
                <button onClick={() => void ask('Rate this draft using the available evidence')}>Rate draft</button>
                <button onClick={() => void ask('How might this draft feel to a reader? Explain uncertainty')}>Reader impression</button>
                <button onClick={() => void ask('Build a short outline from this draft')}>Outline</button>
                <button
                  disabled={selection.start === selection.end}
                  onClick={() => void ask('Rewrite the selected text more clearly while preserving its meaning and voice')}
                >
                  Rewrite selection
                </button>
              </div>
              <div className="messages">
                {messages.map((message, index) => (
                  <div className={message.role} key={index}>
                    <strong>
                      {message.role === 'user' ? 'You' : 'Invariant'}
                    </strong>
                    <p>{message.text}</p>
                    {message.reply?.caveat ? (
                      <small>{message.reply.caveat}</small>
                    ) : null}
                    {message.reply?.replacement && message.reply.range ? (
                      <div className="assistant-rewrite">
                        <blockquote>{message.reply.replacement}</blockquote>
                        <button
                          disabled={
                            message.reply.basisHash !== stableTextHash(draft)
                          }
                          onClick={() => applyAssistantReply(message.reply!)}
                        >
                          {message.reply.basisHash !== stableTextHash(draft)
                            ? 'Draft changed · ask again'
                            : `Replace ${message.reply.range.start === 0 && message.reply.range.end === draft.length ? 'draft' : 'selection'}`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask();
                }}
              >
                <input
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder={
                    assistantEngine === 'structured'
                      ? 'Ask about this draft…'
                      : 'Ask or request a rewrite…'
                  }
                  aria-label="Ask Invariant about this draft"
                  disabled={!draft.trim() || assistantBusy}
                />
                <button disabled={!draft.trim() || !assistantInput.trim() || assistantBusy}>
                  {assistantBusy ? <LoaderCircle className="spin" /> : 'Ask'}
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
      {settings ? (
        <div
          className="settings-backdrop"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSettings(false); }}
        >
          <dialog
            open
            className="settings-panel"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header>
              <div>
                <p className="desk-label">LOCAL INTELLIGENCE</p>
                  <h2 id="settings-title">Writing settings</h2>
              </div>
                <button aria-label="Close settings" onClick={() => setSettings(false)}>
                <X />
              </button>
            </header>
            <label>
              <span>
                <strong>Language model</strong>
                <small>
                  Choose speed or accuracy. Switching unloads the current
                  worker.
                </small>
              </span>
              <select
                aria-label="Language model"
                value={profileId}
                onChange={(event) =>
                  setProfileId(event.target.value as LanguageProfileId)
                }
              >
                {LANGUAGE_PROFILES.map((profile) => (
                  <option value={profile.id} key={profile.id}>
                    {profile.name} · {profile.transfer}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <strong>Writing assistant</strong>
                <small>
                  Document tools are instant. Local generative downloads an
                  English-first 360M model on its first request and requires
                  WebGPU.
                </small>
              </span>
              <select
                aria-label="Writing assistant"
                value={assistantEngine}
                onChange={(event) =>
                  setAssistantEngine(event.target.value as AssistantEngineId)
                }
              >
                {ASSISTANT_ENGINES.map((engine) => (
                  <option
                    value={engine.id}
                    key={engine.id}
                    disabled={
                      engine.id === 'smollm2-360m' &&
                      typeof navigator !== 'undefined' &&
                      !('gpu' in navigator)
                    }
                  >
                    {engine.name} · {engine.transfer}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <strong>Automatic exact corrections</strong>
                <small>
                  Applies only deterministic grammar and spacing fixes. Spelling
                  and style choices remain manual.
                </small>
              </span>
              <button
                className={`switch ${autoCorrect ? 'on' : ''}`}
                role="switch"
                aria-checked={autoCorrect}
                onClick={() => setAutoCorrect((value) => !value)}
              >
                <i />
              </button>
            </label>
            <div className="runtime-facts">
              <span>
                <strong>{runtime?.inspect().leanlets.length ?? 0}</strong>{' '}
                capabilities registered
              </span>
              <span>
                <strong>{report?.trace.length ?? 0}</strong> steps in last
                review
              </span>
              <span>
                <strong>0</strong> inference API calls
              </span>
            </div>
            <div className="model-warning">
              <AlertTriangle />
              <p>
                <strong>Coverage is capability-specific.</strong> Language
                identification is multilingual. The shipped spelling dictionary
                and WordNet reference are English; for other detected languages,
                Invariant abstains from those checks rather than applying
                English rules. The optional SmolLM2 assistant is also
                English-first, requires WebGPU, downloads model assets from the
                model host on first use, and may produce incorrect text.
              </p>
            </div>
          </dialog>
        </div>
      ) : null}
    </main>
  );
}
