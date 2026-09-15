/* oxlint-disable next/no-html-link-for-pages -- Plain anchors keep the static GitHub Pages build portable. */
import { Brand } from '../brand';
export default function PrivacyPage() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <main className="privacy-page">
      <header>
        <a href={`${base}/`}>
          <Brand />
        </a>
        <a href={`${base}/writer/`}>Open writing desk</a>
      </header>
      <article>
        <p className="overline">PRIVACY, IN PLAIN LANGUAGE</p>
        <h1>Your draft stays close to the page.</h1>
        <p>
          Invariant’s core writing checks execute in your browser. The
          application does not send draft text to a hosted inference API and
          does not require an account.
        </p>
        <h2>What is stored</h2>
        <p>
          Documents and the active language profile are stored in this browser’s
          local storage. They are not a backup. Clearing site data, using a
          private window, or changing browser profiles can remove them. Export
          important work as Markdown.
        </p>
        <h2>What is downloaded</h2>
        <p>
          On first use, the browser downloads the application code and the
          selected language model. The English spelling dictionary loads only
          when an English draft needs it. WordNet reference shards load only
          when a word is requested. Browsers may later evict cached files.
        </p>
        <h2>Network boundary</h2>
        <p>
          Static files are fetched from the website that serves Invariant. Draft
          text is processed by local workers and inspectable JavaScript checks.
          There is no remote text-generation or inference endpoint in the
          application.
        </p>
        <p>
          If you explicitly select Local generative, the browser downloads a
          pinned compact model from Hugging Face. The model host receives an
          ordinary asset request, not your draft. Generation runs in a dedicated
          WebGPU worker after the download completes.
        </p>
        <h2>Limits</h2>
        <p>
          Language identification is statistical and can be uncertain on short
          or mixed-language text. The current spelling and word-reference packs
          are English. Privacy patterns catch several common identifiers but are
          not a complete data-loss-prevention system. Invariant displays these
          limits and abstains where coverage is unavailable. The optional
          generative model is English-first and can produce inaccurate or
          meaning-changing text; generated rewrites are never applied without
          your action.
        </p>
        <h2>Third-party data</h2>
        <p>
          Word definitions and relations are derived from Princeton WordNet 3.0
          under its included license. English spelling uses a
          Hunspell-compatible dictionary and nspell. Leanlet provides local
          orchestration.
        </p>
      </article>
    </main>
  );
}
