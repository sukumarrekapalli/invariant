import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeGenerationError,
  LOCAL_GENERATION_PROFILES,
} from '../lib/generation-support.ts';

test('local generation profiles are pinned with distinct GPU requirements', () => {
  const compact = LOCAL_GENERATION_PROFILES['smollm2-135m'];
  const quality = LOCAL_GENERATION_PROFILES['smollm2-360m'];
  assert.equal(compact.dtype, 'q4');
  assert.equal(compact.requiresShaderF16, false);
  assert.equal(quality.dtype, 'q4f16');
  assert.equal(quality.requiresShaderF16, true);
  for (const profile of [compact, quality]) {
    assert.match(profile.revision, /^[a-f0-9]{40}$/);
    assert.match(profile.asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(profile.asset.bytes > 100_000_000);
  }
});

test('generation errors preserve non-Error runtime diagnostics', () => {
  assert.equal(
    describeGenerationError(3330359752),
    'WebGPU runtime error 3330359752',
  );
  assert.equal(
    describeGenerationError({ code: 6 }),
    'WebGPU runtime error 6',
  );
  assert.equal(
    describeGenerationError({ message: 'adapter unavailable' }),
    'adapter unavailable',
  );
});
