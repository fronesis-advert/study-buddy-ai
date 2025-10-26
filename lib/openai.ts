import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { getEnv } from "./env";

// Lazy initialization to avoid calling getEnv() at module load time
let _openai: ReturnType<typeof createOpenAI> | null = null;
let _openaiClient: OpenAI | null = null;

// Function to get the openai instance (for use with AI SDK)
export function getOpenAI() {
  if (!_openai) {
    const { OPENAI_API_KEY } = getEnv();
    _openai = createOpenAI({ apiKey: OPENAI_API_KEY });
  }
  return _openai;
}

// Export as a callable for backwards compatibility
export const openai = (model: string, settings?: any) => {
  return getOpenAI()(model, settings);
};

// Function to get the OpenAI client instance (for direct API calls)
export function getOpenAIClient() {
  if (!_openaiClient) {
    const { OPENAI_API_KEY } = getEnv();
    _openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return _openaiClient;
}

// Export for backwards compatibility
export const openaiClient = new Proxy({} as OpenAI, {
  get(target, prop) {
    return (getOpenAIClient() as any)[prop];
  }
});
