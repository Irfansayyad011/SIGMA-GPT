import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";

export const MyContext = createContext();

const API_BASE = "http://localhost:8080/api";

export const ChatProvider = ({ children }) => {
  const { token, isAuthenticated, openAuthModal } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [currThreadId, setCurrThreadId] = useState(() => uuidv4());
  const [allThreads, setAllThreads] = useState([]);
  const [messages, setMessages] = useState([]); // [{ role: 'user'|'assistant', content: string, timestamp?: Date }]
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeError, setActiveError] = useState(null);

  // Fetch all threads for authenticated user
  const fetchAllThreads = useCallback(async () => {
    if (!token) {
      setAllThreads([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/thread`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAllThreads(data);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllThreads();
    } else {
      setAllThreads([]);
      setMessages([]);
    }
  }, [isAuthenticated, fetchAllThreads]);

  // Create New Chat
  const createNewChat = useCallback(() => {
    setCurrThreadId(uuidv4());
    setMessages([]);
    setPrompt("");
    setCurrentStreamingText("");
    setIsStreaming(false);
    setActiveError(null);
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(false);
    }
  }, []);

  // Switch to an existing thread
  const switchThread = useCallback(
    async (threadId) => {
      if (threadId === currThreadId && messages.length > 0) return;

      setCurrThreadId(threadId);
      setLoadingThread(true);
      setActiveError(null);
      setCurrentStreamingText("");

      if (window.innerWidth < 768) {
        setMobileSidebarOpen(false);
      }

      if (!token) {
        setLoadingThread(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/thread/${threadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const chatHistory = await res.json();
          setMessages(chatHistory);
        } else {
          showError("Could not load conversation history.");
        }
      } catch (err) {
        console.error("Failed to load thread:", err);
        showError("Network error while loading conversation.");
      } finally {
        setLoadingThread(false);
      }
    },
    [currThreadId, messages.length, token, showError]
  );

  // Rename a thread
  const renameThread = useCallback(
    async (threadId, newTitle) => {
      if (!token || !newTitle.trim()) return;

      try {
        const res = await fetch(`${API_BASE}/thread/${threadId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newTitle.trim() }),
        });

        if (res.ok) {
          setAllThreads((prev) =>
            prev.map((t) => (t.threadId === threadId ? { ...t, title: newTitle.trim() } : t))
          );
          showSuccess("Conversation renamed.");
        } else {
          const data = await res.json();
          showError(data.error || "Failed to rename conversation.");
        }
      } catch (err) {
        console.error("Rename error:", err);
        showError("Network error renaming conversation.");
      }
    },
    [token, showSuccess, showError]
  );

  // Delete a thread
  const deleteThread = useCallback(
    async (threadId) => {
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/thread/${threadId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setAllThreads((prev) => prev.filter((t) => t.threadId !== threadId));
          showSuccess("Conversation deleted.");
          if (threadId === currThreadId) {
            createNewChat();
          }
        } else {
          const data = await res.json();
          showError(data.error || "Failed to delete conversation.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        showError("Network error deleting conversation.");
      }
    },
    [token, currThreadId, createNewChat, showSuccess, showError]
  );

  // Send message with SSE streaming
  const sendMessage = useCallback(
    async (textToSend) => {
      const userText = (textToSend || prompt).trim();
      if (!userText || isStreaming) return;

      if (!isAuthenticated) {
        openAuthModal("login");
        showInfo("Please sign in or create an account to start chatting.");
        return;
      }

      setActiveError(null);
      setPrompt("");

      // Optimistically append user message
      const updatedMessages = [...messages, { role: "user", content: userText, timestamp: new Date() }];
      setMessages(updatedMessages);
      setIsStreaming(true);
      setCurrentStreamingText("");

      try {
        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            threadId: currThreadId,
            message: userText,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let streamError = null;
        let buffer = "";
        let accumulatedReply = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.substring(6);
              let parsed = null;
              try {
                parsed = JSON.parse(jsonStr);
              } catch (parseErr) {
                continue;
              }

              if (parsed) {
                if (parsed.error) {
                  streamError = parsed.error;
                  break;
                }
                if (parsed.delta) {
                  accumulatedReply += parsed.delta;
                  setCurrentStreamingText(accumulatedReply);
                } else if (parsed.done) {
                  accumulatedReply = parsed.fullReply || accumulatedReply;
                }
              }
            }
          }

          if (streamError) {
            throw new Error(streamError);
          }
        }

        if (streamError) {
          throw new Error(streamError);
        }

        if (!accumulatedReply.trim()) {
          throw new Error("Received empty response from AI service.");
        }

        // Commit final assistant message to chat history
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulatedReply, timestamp: new Date() },
        ]);
        setCurrentStreamingText("");
        fetchAllThreads();
      } catch (err) {
        console.error("Streaming chat error:", err);
         setMessages((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].role === "user") {
            return prev.slice(0, -1);
          }
          return prev;
        });
         setPrompt(userText);
        setActiveError({
          message: err.message || "Failed to get response. Please check connection and retry.",
          lastPrompt: userText,
        });
        showError(err.message || "Failed to get AI answer.");
      } finally {
        setIsStreaming(false);
        setCurrentStreamingText("");
      }
    },
    [prompt, isStreaming, isAuthenticated, token, currThreadId, messages, openAuthModal, showInfo, showError, fetchAllThreads]
  );

   const retryLastMessage = useCallback(() => {
    if (activeError?.lastPrompt) {
       setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(activeError.lastPrompt);
    }
  }, [activeError, sendMessage]);

  const value = {
    currThreadId,
    setCurrThreadId,
    allThreads,
    setAllThreads,
    messages,
    setMessages,
    prompt,
    setPrompt,
    isStreaming,
    loadingThread,
    currentStreamingText,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    adminModalOpen,
    setAdminModalOpen,
    settingsModalOpen,
    setSettingsModalOpen,
    activeError,
    createNewChat,
    switchThread,
    renameThread,
    deleteThread,
    sendMessage,
    retryLastMessage,
    fetchAllThreads,
  };

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

export const useChat = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};