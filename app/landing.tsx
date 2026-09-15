/* oxlint-disable next/no-html-link-for-pages -- Plain anchors keep the static GitHub Pages build portable. */
import {
  ArrowRight,
  Check,
  CloudOff,
  Eye,
  Feather,
  Gauge,
  Shield,
  WifiOff,
} from 'lucide-react';
import { Brand } from './brand';

const checks = [
  'Spelling and exact corrections',
  'Clarity and readability',
  'Private-data preflight',
  'Language identification',
  'Definitions and word relations',
  'Evidence-bound writing assistant',
];

export default function Landing() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <main className="landing">
      <header className="land-nav">
        <a href={`${base}/`} aria-label="Invariant home">
          <Brand />
        </a>
        <nav>
          <a href="#principles">Principles</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#how">How it works</a>
          <a href={`${base}/privacy/`}>Privacy</a>
        </nav>
        <a className="nav-cta" href={`${base}/writer/`}>
          Open Invariant <ArrowRight />
        </a>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="overline">PRIVATE WRITING SOFTWARE</p>
          <h1>
            Intelligence within.
            <br />
            <em>Voice intact.</em>
          </h1>
          <p className="hero-lead">
            A focused writing environment with scoped intelligence that runs in
            your browser. No account, usage meter, or inference API is required
            for core checks.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href={`${base}/writer/`}>
              Start a private draft <ArrowRight />
            </a>
            <a className="text-link" href="#how">
              See the architecture
            </a>
          </div>
          <p className="precise-note">
            <WifiOff /> First use downloads the application and selected
            language assets. Analysis stays on this device.
          </p>
        </div>
        <div
          className="hero-object"
          aria-label="Invariant writing review preview"
        >
          <div className="folio-head">
            <Brand />
            <span>Local review</span>
          </div>
          <div className="folio-page">
            <span className="folio-kicker">A NOTE ON CRAFT</span>
            <h2>
              Make the sentence
              <br />
              carry its own weight.
            </h2>
            <p>
              Good tools should sharpen attention without taking the work away
              from its author.
            </p>
            <div className="folio-rule">
              <span>CLARITY</span>
              <strong>92</strong>
            </div>
            <div className="folio-comment">
              <Feather />
              <span>
                <strong>One exact edit</strong>
                <small>“in order to” → “to”</small>
              </span>
              <Check />
            </div>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <span>
          <CloudOff /> Core inference: browser-local
        </span>
        <span>
          <Shield /> Draft storage: this device
        </span>
        <span>
          <Gauge /> Runtime: budgeted Leanlets
        </span>
        <span>
          <Eye /> Changes: author controlled
        </span>
      </section>
      <section className="manifesto" id="principles">
        <p className="section-number">01 / PRINCIPLE</p>
        <div>
          <h2>
            The writer remains
            <br />
            the final authority.
          </h2>
          <p>
            Invariant is not a text generator disguised as an editor. It
            examines bounded questions—whether a word is misspelled, a sentence
            is unusually dense, or a draft contains contact information—and
            returns evidence you can accept or ignore.
          </p>
        </div>
      </section>
      <section className="capabilities" id="capabilities">
        <div className="section-intro">
          <p className="section-number">02 / PRACTICE</p>
          <h2>
            Useful checks.
            <br />
            Narrow contracts.
          </h2>
          <p>
            Each capability declares what it can do, when it should abstain, and
            what it costs to load.
          </p>
        </div>
        <div className="capability-ledger">
          {checks.map((item, index) => (
            <div key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
              <small>
                {index < 4
                  ? 'Runs during local review'
                  : 'Loads only when requested'}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="architecture" id="how">
        <p className="section-number">03 / ARCHITECTURE</p>
        <div className="architecture-copy">
          <h2>
            Several small intelligences.
            <br />
            One coherent review.
          </h2>
          <p>
            Invariant uses Leanlet to coordinate independent browser workers and
            inspectable JavaScript checks. The kernel schedules work, shares
            loaded resources, enforces network policy, and returns typed results
            to the editor.
          </p>
        </div>
        <div className="architecture-flow">
          <div className="arch-node">
            <span>01</span>
            <strong>Your draft</strong>
            <small>Editor state on device</small>
          </div>
          <div className="arch-line">
            <i />
          </div>
          <div className="arch-node kernel">
            <span>02</span>
            <strong>Leanlet kernel</strong>
            <small>Policy · budget · lifecycle</small>
          </div>
          <div className="arch-line">
            <i />
          </div>
          <div className="arch-stack">
            <span>Language worker</span>
            <span>Spelling worker</span>
            <span>Clarity checks</span>
            <span>Privacy checks</span>
          </div>
          <div className="arch-line">
            <i />
          </div>
          <div className="arch-node">
            <span>04</span>
            <strong>Typed evidence</strong>
            <small>Suggestions you control</small>
          </div>
        </div>
        <p className="architecture-caveat">
          Static model and dictionary files are ordinary website assets. After
          compatible assets are cached, supported checks can continue without an
          inference service; browser cache eviction may require them to be
          fetched again.
        </p>
      </section>
      <section className="closing">
        <Brand inverse />
        <h2>Your words remain yours.</h2>
        <p>
          Write, inspect, and revise with intelligence that stays close to the
          page.
        </p>
        <a href={`${base}/writer/`}>
          Open the writing desk <ArrowRight />
        </a>
      </section>
      <footer className="land-footer">
        <span>Invariant · Open-source writing software</span>
        <div>
          <a href={`${base}/privacy/`}>Privacy</a>
          <a
            href="https://sukumarrekapalli.github.io/leanlet/"
            target="_blank"
            rel="noreferrer"
          >
            Powered by Leanlet
          </a>
          <a
            href="https://github.com/sukumarrekapalli"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
