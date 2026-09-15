import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import nspell from 'nspell';

test('shipped English dictionary produces source-backed spelling suggestions', async () => {
  const [aff, dic] = await Promise.all([
    readFile(new URL('../lib/generated/en.aff', import.meta.url), 'utf8'),
    readFile(new URL('../lib/generated/en.dic', import.meta.url), 'utf8'),
  ]);
  const spell = nspell({ aff, dic });
  assert.equal(spell.correct('writing'), true);
  assert.equal(spell.correct('writng'), false);
  assert.equal(spell.suggest('writng').includes('writing'), true);
});

test('generated WordNet shard contains definitions and lexical relations', async () => {
  const shard = JSON.parse(await readFile(new URL('../public/lexicon/wr.json', import.meta.url), 'utf8'));
  assert.equal(Array.isArray(shard.write), true);
  assert.equal(shard.write.some((sense) => sense.definition.length > 10), true);
  assert.equal(shard.write.some((sense) => sense.synonyms.length > 0), true);
});
