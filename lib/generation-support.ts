import {
  matchesRuntimeRequirements,
  probeRuntimeCapabilities,
  type LeanletRuntimeCapabilities,
  type LeanletRuntimeRequirements,
  type RuntimeCapabilityProbeOptions,
} from 'leanlet-ai/kernel';

export type LocalGenerationProfileId = 'smollm2-135m' | 'smollm2-360m';

export type LocalGenerationProfile = {
  id: LocalGenerationProfileId;
  leanletId: `writer.generate-${LocalGenerationProfileId}`;
  modelId: string;
  revision: string;
  dtype: 'q4' | 'q4f16';
  label: string;
  requirements: LeanletRuntimeRequirements;
  estimatedResidentBytes: number;
  asset: { path: string; bytes: number; sha256: string };
};

export const LOCAL_GENERATION_PROFILES: Record<
  LocalGenerationProfileId,
  LocalGenerationProfile
> = {
  'smollm2-135m': {
    id: 'smollm2-135m',
    leanletId: 'writer.generate-smollm2-135m',
    modelId: 'onnx-community/SmolLM2-135M-Instruct-ONNX',
    revision: 'b8a5c0f183b78c55955a5364f610c36668b5e681',
    dtype: 'q4',
    label: 'SmolLM2 135M q4',
    requirements: { webgpu: true },
    estimatedResidentBytes: 480 * 1024 * 1024,
    asset: {
      path: 'https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/b8a5c0f183b78c55955a5364f610c36668b5e681/onnx/model_q4.onnx',
      bytes: 180_581_125,
      sha256:
        'eb0d67c7e3b7d40f42d681b5f2eff4cef78968afe3f76c954f987dd870327a2a',
    },
  },
  'smollm2-360m': {
    id: 'smollm2-360m',
    leanletId: 'writer.generate-smollm2-360m',
    modelId: 'onnx-community/SmolLM2-360M-Instruct-ONNX',
    revision: 'fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9',
    dtype: 'q4f16',
    label: 'SmolLM2 360M q4f16',
    requirements: { webgpuFeatures: ['shader-f16'] },
    estimatedResidentBytes: 720 * 1024 * 1024,
    asset: {
      path: 'https://huggingface.co/onnx-community/SmolLM2-360M-Instruct-ONNX/resolve/fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9/onnx/model_q4f16.onnx',
      bytes: 272_353_302,
      sha256:
        'ed196149bd9f24de0aa78f2ce8c6fa1167f71de9857173d1a231a4cbc01fb1c0',
    },
  },
};

export type GenerationSupport = {
  checked: true;
  capabilities: LeanletRuntimeCapabilities;
  webgpu: boolean;
  shaderF16: boolean;
  compatibleProfiles: Record<LocalGenerationProfileId, boolean>;
  reason?: string;
};

export async function inspectGenerationSupport(
  options?: RuntimeCapabilityProbeOptions,
): Promise<GenerationSupport> {
  const capabilities = await probeRuntimeCapabilities(options);
  const compact = matchesRuntimeRequirements(
    LOCAL_GENERATION_PROFILES['smollm2-135m'].requirements,
    capabilities,
  );
  const quality = matchesRuntimeRequirements(
    LOCAL_GENERATION_PROFILES['smollm2-360m'].requirements,
    capabilities,
  );
  const reason = capabilities.webgpu.available
    ? undefined
    : capabilities.webgpu.reason === 'api-unavailable'
      ? 'WebGPU is not exposed by this browser.'
      : capabilities.webgpu.reason === 'adapter-unavailable'
        ? 'No WebGPU adapter is available. Hardware acceleration may be disabled.'
        : 'WebGPU capability detection failed.';
  return {
    checked: true,
    capabilities,
    webgpu: capabilities.webgpu.available,
    shaderF16:
      capabilities.webgpu.available &&
      capabilities.webgpu.features.includes('shader-f16'),
    compatibleProfiles: {
      'smollm2-135m': compact.compatible,
      'smollm2-360m': quality.compatible,
    },
    reason,
  };
}

export function describeGenerationError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'number') return `WebGPU runtime error ${error}`;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'error', 'reason', 'code']) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number')
        return `${key === 'code' ? 'WebGPU runtime error ' : ''}${value}`;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Fall through to the stable message.
    }
  }
  return 'The browser model runtime did not provide an error message.';
}
