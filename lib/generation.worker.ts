/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';
import {
  buildGenerativeMessages,
  isRewriteRequest,
} from './document-assistant.ts';
import { stableTextHash } from './analyzers.ts';
import type { AssistantReply, AssistantRequest } from './writer-types.ts';

declare const self: DedicatedWorkerGlobalScope;

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
type Generator = {
  (
    input: ReadonlyArray<{ role: string; content: string }>,
    options: Record<string, unknown>,
  ): Promise<Array<{ generated_text: string | Array<{ role: string; content: string }> }>>;
  dispose?: () => void | Promise<void>;
};

let generator: Generator | undefined;

function send(value: unknown) {
  self.postMessage(value);
}

async function load(requestId: number) {
  if (generator) return generator;
  // This profile is remote-first. Enabling local lookup against a SPA host can
  // return index.html for missing model metadata and fail JSON parsing.
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  generator = (await pipeline('text-generation', MODEL_ID, {
    device: 'webgpu',
    dtype: 'q4f16',
    progress_callback: (progress: Record<string, unknown>) => {
      send({
        type: 'progress',
        requestId,
        status: progress.status,
        file: progress.file,
        progress:
          typeof progress.progress === 'number' ? progress.progress : undefined,
      });
    },
  })) as unknown as Generator;
  return generator;
}

function generatedText(output: Awaited<ReturnType<Generator>>) {
  const value = output[0]?.generated_text;
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.at(-1)?.content?.trim() ?? '';
  return '';
}

self.onmessage = async (
  event: MessageEvent<
    | { type: 'load'; requestId: number }
    | { type: 'generate'; requestId: number; request: AssistantRequest }
    | { type: 'dispose'; requestId: number }
  >,
) => {
  const message = event.data;
  try {
    if (message.type === 'dispose') {
      await generator?.dispose?.();
      generator = undefined;
      send({ type: 'disposed', requestId: message.requestId });
      return;
    }
    const model = await load(message.requestId);
    if (message.type === 'load') {
      send({ type: 'ready', requestId: message.requestId });
      return;
    }
    const output = await model(buildGenerativeMessages(message.request), {
      max_new_tokens: 220,
      do_sample: false,
      repetition_penalty: 1.08,
    });
    const answer = generatedText(output);
    const rewrite = isRewriteRequest(message.request.question);
    const reply: AssistantReply = {
      basisHash: stableTextHash(message.request.text),
      answer: rewrite
        ? 'A local generative rewrite is ready. Review it before replacing your words.'
        : answer || 'The local model returned no text.',
      findingIds: [],
      supported: Boolean(answer),
      source: 'generative',
      kind: rewrite ? 'rewrite' : 'answer',
      replacement: rewrite && answer ? answer : undefined,
      range:
        rewrite && answer
          ? message.request.selection
            ? {
                start: message.request.selection.start,
                end: message.request.selection.end,
              }
            : { start: 0, end: message.request.text.length }
          : undefined,
      caveat:
        'SmolLM2 360M is an English-first compact model. Generated text may be inaccurate or alter meaning; verify every change.',
    };
    send({ type: 'result', requestId: message.requestId, result: reply });
  } catch (error) {
    send({
      type: 'error',
      requestId: message.requestId,
      message:
        error instanceof Error
          ? error.message
          : 'The local generative model could not run.',
    });
  }
};
