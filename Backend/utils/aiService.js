import { getGeminiResponse, streamGeminiResponse } from "./gemini.js";

 
export const getAIResponse = async (message, history = []) => {
  return await getGeminiResponse(message, history);
};

export const streamAIResponse = async function* (message, history = []) {
  yield* streamGeminiResponse(message, history);
};

export default getAIResponse;
