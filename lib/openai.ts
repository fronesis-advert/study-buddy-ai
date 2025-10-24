import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { getEnv } from "./env";

// Lazy initialization to avoid calling getEnv() at module load time
let _openai: ReturnType<typeof createOpenAI> | null = null;
let _openaiClient: OpenAI | null = null;

export const openai = new Proxy({} as ReturnType<typeof createOpenAI>, {
  get(target, prop) {
    if (!_openai) {
      const { OPENAI_API_KEY } = getEnv();
      _openai = createOpenAI({ apiKey: OPENAI_API_KEY });
    }
    return (_openai as any)[prop];
  }
});

export const openaiClient = new Proxy({} as OpenAI, {
  get(target, prop) {
    if (!_openaiClient) {
      const { OPENAI_API_KEY } = getEnv();
      _openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
    }
    return (_openaiClient as any)[prop];
  }
});
