import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SYSTEM_INSTRUCTION =
  "You are SigmaGPT, an advanced, highly intelligent, articulate, and accurate AI assistant. Provide concise, clear, and accurate answers. Format code snippets with proper Markdown syntax.";

 
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    const err = new Error(
      "AI service is not configured. Please configure GEMINI_API_KEY in the server environment."
    );
    err.status = 503;
    err.isConfigurationError = true;
    throw err;
  }

  return new GoogleGenerativeAI(apiKey);
};

 
export const formatGeminiHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const formatted = [];

   const recentHistory = history.slice(-10);

  for (const msg of recentHistory) {
    const text = msg.content?.trim();
    if (!text) continue;

    const role = msg.role === "assistant" ? "model" : "user";

     if (formatted.length === 0 && role !== "user") {
      continue;
    }

     if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += "\n\n" + text;
    } else {
      formatted.push({
        role,
        parts: [{ text }],
      });
    }
  }

   if (formatted.length > 0 && formatted[formatted.length - 1].role === "user") {
    formatted.pop();
  }

  return formatted;
};

 
export const handleGeminiError = (err) => {
  const msg = err.message || String(err);
  console.error("[Gemini API Error]:", msg);

  if (err.isConfigurationError || msg.includes("AI service is not configured")) {
    return new Error(
      "AI service is not configured. Please configure GEMINI_API_KEY in the server environment."
    );
  }

  if (
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid") ||
    msg.includes("400") && msg.includes("key") ||
    msg.includes("403")
  ) {
    return new Error("Invalid Gemini API key. Please verify your GEMINI_API_KEY configuration.");
  }

  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  ) {
    return new Error(
      "Gemini API quota exceeded or rate limit reached. Please try again in a few moments."
    );
  }

  if (msg.includes("SAFETY") || msg.includes("blocked")) {
    return new Error("The response was blocked due to safety guidelines.");
  }

  if (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("503")
  ) {
    return new Error("Gemini is temporarily unavailable. Please try again.");
  }

  return new Error("Gemini is temporarily unavailable. Please try again.");
};

 
export const getGeminiResponse = async (message, history = []) => {
  try {
    const genAI = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const formattedHistory = formatGeminiHistory(history);
    const chat = model.startChat({ history: formattedHistory });

    const result = await chat.sendMessage(message.trim());
    const response = await result.response;
    const text = response.text();

    if (!text || !text.trim()) {
      throw new Error("Received empty response from Gemini.");
    }

    return text;
  } catch (err) {
    throw handleGeminiError(err);
  }
};

 
export async function* streamGeminiResponse(message, history = []) {
  try {
    const genAI = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const formattedHistory = formatGeminiHistory(history);
    const chat = model.startChat({ history: formattedHistory });

    const result = await chat.sendMessageStream(message.trim());

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (err) {
    throw handleGeminiError(err);
  }
}

export default {
  getGeminiResponse,
  streamGeminiResponse,
  getGeminiClient,
};
