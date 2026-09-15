import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wordnet = join(root, 'node_modules', 'wordnet-db', 'dict');
const output = join(root, 'public', 'lexicon');
const generated = join(root, 'lib', 'generated');
const parts = [
  ['noun', 'n'],
  ['verb', 'v'],
  ['adj', 'a'],
  ['adv', 'r'],
];
const synsets = new Map();

for (const [file, partOfSpeech] of parts) {
  const lines = (await readFile(join(wordnet, `data.${file}`), 'utf8')).split(
    '\n',
  );
  for (const line of lines) {
    if (!/^\d/.test(line)) continue;
    const [record, gloss = ''] = line.split(' | ');
    const tokens = record.trim().split(/\s+/);
    const offset = tokens[0];
    const wordCount = Number.parseInt(tokens[3], 16);
    let cursor = 4;
    const words = [];
    for (let index = 0; index < wordCount; index += 1) {
      words.push(tokens[cursor].replaceAll('_', ' '));
      cursor += 2;
    }
    const pointerCount = Number(tokens[cursor++]);
    const pointers = [];
    for (let index = 0; index < pointerCount; index += 1) {
      const symbol = tokens[cursor++];
      const targetOffset = tokens[cursor++];
      const targetPos = tokens[cursor++];
      const sourceTarget = tokens[cursor++];
      pointers.push({ symbol, targetOffset, targetPos, sourceTarget });
    }
    synsets.set(`${partOfSpeech}:${offset}`, {
      partOfSpeech,
      words,
      gloss,
      pointers,
    });
  }
}

const entries = new Map();
for (const synset of synsets.values()) {
  for (let wordIndex = 0; wordIndex < synset.words.length; wordIndex += 1) {
    const word = synset.words[wordIndex];
    const key = word.toLocaleLowerCase('en-US');
    const antonyms = new Set();
    for (const pointer of synset.pointers) {
      if (pointer.symbol !== '!') continue;
      const sourceIndex = Number.parseInt(pointer.sourceTarget.slice(0, 2), 16);
      const targetIndex = Number.parseInt(pointer.sourceTarget.slice(2), 16);
      if (sourceIndex && sourceIndex !== wordIndex + 1) continue;
      const target = synsets.get(
        `${pointer.targetPos}:${pointer.targetOffset}`,
      );
      if (!target) continue;
      if (targetIndex) {
        if (target.words[targetIndex - 1])
          antonyms.add(target.words[targetIndex - 1]);
      } else {
        for (const targetWord of target.words) antonyms.add(targetWord);
      }
    }
    const senses = entries.get(key) ?? [];
    senses.push({
      partOfSpeech: synset.partOfSpeech,
      definition: synset.gloss,
      synonyms: synset.words.filter(
        (candidate) => candidate.toLocaleLowerCase('en-US') !== key,
      ),
      antonyms: [...antonyms],
    });
    entries.set(key, senses);
  }
}

const shards = new Map();
for (const [word, senses] of entries) {
  const normalized = word.normalize('NFKD').replace(/[^a-z]/g, '');
  const shard = normalized ? `${normalized[0]}${normalized[1] ?? '_'}` : '__';
  const values = shards.get(shard) ?? {};
  values[word] = senses.slice(0, 4);
  shards.set(shard, values);
}

await mkdir(output, { recursive: true });
await mkdir(generated, { recursive: true });
for (const [shard, values] of shards) {
  await writeFile(join(output, `${shard}.json`), JSON.stringify(values));
}
await writeFile(
  join(output, 'LICENSE.txt'),
  await readFile(join(root, 'node_modules', 'wordnet-db', 'LICENSE'), 'utf8'),
);
await copyFile(
  join(root, 'node_modules', 'dictionary-en', 'index.aff'),
  join(generated, 'en.aff'),
);
await copyFile(
  join(root, 'node_modules', 'dictionary-en', 'index.dic'),
  join(generated, 'en.dic'),
);
console.log(
  `Built ${entries.size.toLocaleString()} local entries across ${shards.size} lazy shards.`,
);
