import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeGenerationError,
  inspectGenerationSupport,
  LOCAL_GENERATION_PROFILES,
} from '../lib/generation-support.ts';

test('local generation profiles are pinned with distinct GPU requirements', () => {
  const compact = LOCAL_GENERATION_PROFILES['smollm2-135m'];
  const quality = LOCAL_GENERATION_PROFILES['smollm2-360m'];
  assert.equal(compact.dtype, 'q4');
  assert.deepEqual(compact.requirements, { webgpu: true });
  assert.equal(quality.dtype, 'q4f16');
  assert.deepEqual(quality.requirements, {
    webgpuFeatures: ['shader-f16'],
  });
  for (const profile of [compact, quality]) {
    assert.match(profile.revision, /^[a-f0-9]{40}$/);
    assert.match(profile.asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(profile.asset.bytes > 100_000_000);
  }
});

test('generation support delegates capability matching to Leanlet', async () => {
  const support = await inspectGenerationSupport({
    navigator: {
      gpu: {
        requestAdapter: async () => ({ features: new Set() }),
      },
    },
    webAssembly: true,
    workers: true,
  });

  assert.equal(support.webgpu, true);
  assert.equal(support.compatibleProfiles['smollm2-135m'], true);
  assert.equal(support.compatibleProfiles['smollm2-360m'], false);
  assert.equal(support.capabilities.schemaVersion, 1);
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
