import React, { useState, useRef, useEffect } from "react";
import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { useChat } from "./MyContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export default function ChatWindow() {
  const {
    prompt,
    setPrompt,
    isStreaming,
    sendMessage,
    setMobileSidebarOpen,
    setSettingsModalOpen,
    setAdminModalOpen,
    messages,
    currentStreamingText,
  } = useChat();

  const { user, isAuthenticated, isAdmin, openAuthModal, logout } = useAuth();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom on new messages / streaming text
  const scrollToBottom = (behavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, currentStreamingText, isStreaming]);

  // Track scroll position to show/hide scroll to bottom button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [prompt]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isStreaming) {
        sendMessage(prompt);
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim() && !isStreaming) {
      sendMessage(prompt);
    }
  };

  return (
    <main className="chatwindow">
      {/* Top Navbar */}
      <header className="chat-navbar">
        <div className="navbar-left">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation sidebar"
          >
            <i className="fa-solid fa-bars"></i>
          </button>

          <div className="model-selector-pill">
            <span className="model-name">SigmaGPT</span>
            <span className="model-tag">Gemini 3.6 Flash</span>
          </div>
        </div>

        <div className="navbar-right">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="profile-menu-container">
              <button
                className="user-profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="User menu"
              >
                <div className="user-avatar-small">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <span className="user-name-label">{user.username}</span>
                <i className="fa-solid fa-chevron-down chevron-icon"></i>
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="dropdown-backdrop"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="profile-dropdown-menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-username">{user.username}</div>
                      <div className="dropdown-role">
                        Role: <strong>{user.role}</strong>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    {isAdmin && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setAdminModalOpen(true);
                        }}
                      >
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSettingsModalOpen(true);
                      }}
                    >
                      <i className="fa-solid fa-gear"></i>
                      <span>Account Settings</span>
                    </button>

                    <div className="dropdown-divider" />

                    <button
                      className="dropdown-item logout-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket"></i>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              className="primary-btn nav-signin-btn"
              onClick={() => openAuthModal("login")}
            >
              <i className="fa-solid fa-user"></i>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Message Viewport */}
      <div className="chat-scroll-container" ref={scrollRef} onScroll={handleScroll}>
        <Chat />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          className="scroll-bottom-btn"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to bottom"
        >
          <i className="fa-solid fa-arrow-down"></i>
        </button>
      )}

      {/* Chat Input Container */}
      <footer className="chat-input-container">
        <form className="chat-input-form" onSubmit={handleFormSubmit}>
          <div className="input-box-wrapper">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={
                isAuthenticated
                  ? "Message SigmaGPT... (Enter to send, Shift+Enter for new line)"
                  : "Sign in to send messages and save conversation history..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              aria-label="Message prompt input"
            />

            <button
              type="submit"
              className={`submit-send-btn ${prompt.trim() && !isStreaming ? "active" : ""}`}
              disabled={!prompt.trim() || isStreaming}
              aria-label="Send message"
            >
              {isStreaming ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-arrow-up"></i>
              )}
            </button>
          </div>
        </form>

        <p className="chat-disclaimer">
          SigmaGPT can make mistakes. Verify important factual information.
        </p>
      </footer>
    </main>
  );
}
