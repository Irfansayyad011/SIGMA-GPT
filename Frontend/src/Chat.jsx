import React, { useState } from "react";
import "./Chat.css";
import { useChat } from "./MyContext";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const PROMPT_SUGGESTIONS = [
  {
    icon: "fa-code",
    title: "Write clean code",
    desc: "Create a React component with state and props",
    prompt: "Write a complete React functional component for an interactive data filter with search.",
  },
  {
    icon: "fa-bug",
    title: "Debug an issue",
    desc: "Diagnose and fix CORS or async errors",
    prompt: "How do I fix a CORS error in an Express.js backend connecting to a Vite frontend?",
  },
  {
    icon: "fa-lightbulb",
    title: "Explain a concept",
    desc: "Deep dive into system design & databases",
    prompt: "Explain the difference between SQL and NoSQL databases with pros and cons.",
  },
  {
    icon: "fa-pen-nib",
    title: "Draft content",
    desc: "Draft technical specs or project docs",
    prompt: "Write a professional project README template for a full-stack SaaS application.",
  },
];

export default function Chat() {
  const {
    messages,
    isStreaming,
    currentStreamingText,
    loadingThread,
    sendMessage,
    activeError,
    retryLastMessage,
  } = useChat();

  const { user, isAuthenticated } = useAuth();
  const { showSuccess } = useToast();
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showSuccess("Message copied to clipboard!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  if (loadingThread) {
    return (
      <div className="chat-loading-container">
        <div className="chat-loading-spinner">
          <i className="fa-solid fa-spinner fa-spin"></i>
        </div>
        <p>Loading conversation history...</p>
      </div>
    );
  }

  // Welcome Screen when no messages
  if (messages.length === 0 && !isStreaming && !currentStreamingText) {
    return (
      <div className="chat-welcome-container">
        <div className="welcome-hero">
          <div className="welcome-logo-badge">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <h1>What can I help you with today?</h1>
          <p className="welcome-subtitle">
            SigmaGPT provides fast, intelligent answers with real-time streaming, code generation,
            and conversation persistence.
          </p>
        </div>

        <div className="suggestions-grid">
          {PROMPT_SUGGESTIONS.map((item, idx) => (
            <div
              key={idx}
              className="suggestion-card"
              onClick={() => sendMessage(item.prompt)}
              role="button"
              tabIndex={0}
            >
              <div className="suggestion-icon">
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <div className="suggestion-content">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
              <i className="fa-solid fa-arrow-right suggestion-arrow"></i>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chats-wrapper">
      <div className="chats-list">
        {messages.map((chat, idx) => {
          const isUser = chat.role === "user";
          return (
            <div
              key={idx}
              className={`message-row ${isUser ? "message-user" : "message-assistant"}`}
            >
              <div className="message-avatar">
                {isUser ? (
                  <span>
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : "U"}
                  </span>
                ) : (
                  <div className="assistant-avatar-icon">
                    <i className="fa-solid fa-bolt"></i>
                  </div>
                )}
              </div>

              <div className="message-bubble-wrapper">
                <div className="message-header-meta">
                  <span className="sender-name">{isUser ? "You" : "SigmaGPT"}</span>
                  {chat.timestamp && (
                    <span className="message-timestamp">{formatTime(chat.timestamp)}</span>
                  )}
                </div>

                <div className="message-bubble">
                  {isUser ? (
                    <p className="user-message-text">{chat.content}</p>
                  ) : (
                    <div className="assistant-markdown-body">
                      <ReactMarkdown
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          pre({ node, children, ...props }) {
                            return <div className="code-block-container">{children}</div>;
                          },
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            const rawCode = String(children).replace(/\n$/, "");
                            if (!inline) {
                              return (
                                <div className="code-block-wrapper">
                                  <div className="code-block-header">
                                    <span className="code-lang">
                                      {match ? match[1] : "code"}
                                    </span>
                                    <button
                                      type="button"
                                      className="copy-code-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(rawCode);
                                        showSuccess("Code copied to clipboard!");
                                      }}
                                    >
                                      <i className="fa-regular fa-copy"></i> Copy code
                                    </button>
                                  </div>
                                  <pre className="code-pre">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <code className="inline-code" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {chat.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Message Action Bar for Assistant */}
                {!isUser && (
                  <div className="message-actions-bar">
                    <button
                      className="msg-action-btn"
                      onClick={() => copyToClipboard(chat.content, idx)}
                      title="Copy response"
                    >
                      <i
                        className={`fa-solid ${
                          copiedIdx === idx ? "fa-check" : "fa-copy"
                        }`}
                      ></i>
                      <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                    </button>

                    {idx === messages.length - 1 && (
                      <button
                        className="msg-action-btn"
                        onClick={retryLastMessage}
                        title="Retry response"
                      >
                        <i className="fa-solid fa-rotate-right"></i>
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-time SSE Streaming Message */}
        {isStreaming && (
          <div className="message-row message-assistant streaming-row">
            <div className="message-avatar">
              <div className="assistant-avatar-icon pulsing">
                <i className="fa-solid fa-bolt"></i>
              </div>
            </div>

            <div className="message-bubble-wrapper">
              <div className="message-header-meta">
                <span className="sender-name">SigmaGPT</span>
                <span className="streaming-status-tag">Generating...</span>
              </div>

              <div className="message-bubble">
                <div className="assistant-markdown-body">
                  {currentStreamingText ? (
                    <>
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {currentStreamingText}
                      </ReactMarkdown>
                      <span className="streaming-cursor"></span>
                    </>
                  ) : (
                    <div className="streaming-thinking">
                      <span className="dot dot-1"></span>
                      <span className="dot dot-2"></span>
                      <span className="dot dot-3"></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Error Banner */}
        {activeError && (
          <div className="chat-error-banner">
            <div className="error-icon">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <div className="error-body">
              <strong>Generation Error</strong>
              <p>{activeError.message}</p>
            </div>
            <button className="error-retry-btn" onClick={retryLastMessage}>
              <i className="fa-solid fa-rotate-right"></i> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
