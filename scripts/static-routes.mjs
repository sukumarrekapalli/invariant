import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/client/', import.meta.url);
const source = await readFile(new URL('index.html', output), 'utf8');
const pages = {
  writer: { title: 'Writing desk — Invariant', description: 'Write and review locally with scoped browser intelligence.' },
  privacy: { title: 'Privacy — Invariant', description: 'How Invariant stores drafts and runs writing intelligence in your browser.' },
};
for (const [route, metadata] of Object.entries(pages)) {
  await mkdir(new URL(`${route}/`, output), { recursive: true });
  const html = source
    .replace('<title>Invariant — Private, local-first writing software</title>', `<title>${metadata.title}</title>`)
    .replace('Invariant is a private writing environment with scoped intelligence running in your browser.', metadata.description)
    .replace('https://sukumarrekapalli.github.io/invariant/', `https://sukumarrekapalli.github.io/invariant/${route}/`);
  await writeFile(new URL(`${route}/index.html`, output), html);
}
await copyFile(new URL('index.html', output), new URL('404.html', output));
