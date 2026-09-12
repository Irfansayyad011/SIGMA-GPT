import express from "express";
import Thread from "../models/thread.js";
import { requireAuth } from "../middleware/auth.js";
import { getGeminiResponse, streamGeminiResponse } from "../utils/gemini.js";

const router = express.Router();

 router.use(requireAuth);

 router.get("/thread", async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.user._id })
      .select("threadId title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.json(threads);
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

router.get("/threads", async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.user._id })
      .select("threadId title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.json(threads);
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

 router.get("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;

  try {
    const thread = await Thread.findOne({
      threadId,
      $or: [
        { userId: req.user._id },
        { ...(req.user.role === "admin" ? {} : { userId: req.user._id }) },
      ],
    });

    if (!thread) {
      return res.status(404).json({ error: "Conversation thread not found." });
    }

    res.json(thread.messages);
  } catch (err) {
    console.error("Get thread by ID error:", err);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

 router.patch("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Thread title cannot be empty." });
  }

  try {
    const thread = await Thread.findOne({ threadId, userId: req.user._id });
    if (!thread) {
      return res.status(404).json({ error: "Conversation thread not found." });
    }

    thread.title = title.trim();
    thread.updatedAt = new Date();
    await thread.save();

    res.json({ success: true, threadId: thread.threadId, title: thread.title });
  } catch (err) {
    console.error("Rename thread error:", err);
    res.status(500).json({ error: "Failed to rename conversation." });
  }
});

 router.delete("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;
  try {
    const deleted = await Thread.findOneAndDelete({
      threadId,
      $or: [
        { userId: req.user._id },
        { ...(req.user.role === "admin" ? {} : { userId: req.user._id }) },
      ],
    });

    if (!deleted) {
      return res.status(404).json({ error: "Conversation thread not found." });
    }

    res.status(200).json({ success: "Thread deleted successfully", threadId });
  } catch (err) {
    console.error("Delete thread error:", err);
    res.status(500).json({ error: "Failed to delete conversation." });
  }
});

 router.post("/chat", async (req, res) => {
   const threadId = req.body.threadId || req.body.conversationId;
  const { message } = req.body;

  if (!threadId || !message || !message.trim()) {
    return res.status(400).json({ error: "Conversation ID and message are required." });
  }

  const cleanMessage = message.trim();

  try {
    let thread = await Thread.findOne({ threadId, userId: req.user._id });
    const existingHistory = thread ? thread.messages : [];

    // Call Gemini API with conversation history context
    const assistantReply = await getGeminiResponse(cleanMessage, existingHistory);

    // Save user message and assistant reply to DB only on successful response
    if (!thread) {
      const title = cleanMessage.length > 35 ? cleanMessage.slice(0, 35) + "..." : cleanMessage;
      thread = new Thread({
        userId: req.user._id,
        threadId,
        title,
        messages: [
          { role: "user", content: cleanMessage, timestamp: new Date() },
          { role: "assistant", content: assistantReply, timestamp: new Date() },
        ],
      });
    } else {
      thread.messages.push({ role: "user", content: cleanMessage, timestamp: new Date() });
      thread.messages.push({ role: "assistant", content: assistantReply, timestamp: new Date() });
      thread.updatedAt = new Date();
    }

    await thread.save();

    res.json({ reply: assistantReply, threadId: thread.threadId });
  } catch (err) {
    console.error("Chat completion error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Failed to communicate with AI provider.",
    });
  }
});

 router.post("/chat/stream", async (req, res) => {
  const threadId = req.body.threadId || req.body.conversationId;
  const { message } = req.body;

  if (!threadId || !message || !message.trim()) {
    return res.status(400).json({ error: "Conversation ID and message are required." });
  }

  const cleanMessage = message.trim();

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    let thread = await Thread.findOne({ threadId, userId: req.user._id });
    const existingHistory = thread ? thread.messages : [];

     const stream = streamGeminiResponse(cleanMessage, existingHistory);

    let fullAssistantReply = "";

    for await (const chunkText of stream) {
      if (chunkText) {
        fullAssistantReply += chunkText;
        res.write(`data: ${JSON.stringify({ delta: chunkText })}\n\n`);
      }
    }

    if (!fullAssistantReply.trim()) {
      throw new Error("Received empty response from Gemini.");
    }

     if (!thread) {
      const title = cleanMessage.length > 35 ? cleanMessage.slice(0, 35) + "..." : cleanMessage;
      thread = new Thread({
        userId: req.user._id,
        threadId,
        title,
        messages: [
          { role: "user", content: cleanMessage, timestamp: new Date() },
          { role: "assistant", content: fullAssistantReply, timestamp: new Date() },
        ],
      });
    } else {
      thread.messages.push({ role: "user", content: cleanMessage, timestamp: new Date() });
      thread.messages.push({
        role: "assistant",
        content: fullAssistantReply,
        timestamp: new Date(),
      });
      thread.updatedAt = new Date();
    }

    await thread.save();

    res.write(`data: ${JSON.stringify({ done: true, fullReply: fullAssistantReply })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat stream error:", err);
    res.write(
      `data: ${JSON.stringify({
        error: err.message || "Failed to communicate with AI provider.",
      })}\n\n`
    );
    res.end();
  }
});

export default router;
