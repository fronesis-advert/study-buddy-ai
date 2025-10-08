import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { getEnv } from "./env";

const { OPENAI_API_KEY } = getEnv();

export const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

export const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

