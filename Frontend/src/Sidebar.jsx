import React, { useState } from "react";
import "./Sidebar.css";
import { useChat } from "./MyContext";
import { useAuth } from "./context/AuthContext";
import ConfirmModal from "./components/ConfirmModal";
import RenameModal from "./components/RenameModal";

export default function Sidebar() {
  const {
    allThreads,
    currThreadId,
    createNewChat,
    switchThread,
    renameThread,
    deleteThread,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    setAdminModalOpen,
    setSettingsModalOpen,
  } = useChat();

  const { user, isAuthenticated, isAdmin, openAuthModal, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [threadToDelete, setThreadToDelete] = useState(null);
  const [threadToRename, setThreadToRename] = useState(null);

   const filteredThreads = allThreads.filter((t) =>
    (t.title || "New Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileSidebarOpen ? "sidebar-mobile-open" : ""}`}>
        {/* Top Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={createNewChat}>
            <div className="brand-icon">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <span className="brand-name">SigmaGPT</span>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="new-chat-container">
          <button className="new-chat-btn" onClick={createNewChat}>
            <i className="fa-solid fa-plus"></i>
            <span>New Chat</span>
            <span className="shortcut-hint">Ctrl+K</span>
          </button>
        </div>

        {/* Search Conversations */}
        {allThreads.length > 3 && (
          <div className="sidebar-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        {/* Thread History List */}
        <div className="threads-section">
          <div className="threads-label">
            <span>Conversations</span>
            {allThreads.length > 0 && <span className="count-tag">{allThreads.length}</span>}
          </div>

          <div className="threads-list">
            {!isAuthenticated ? (
              <div className="sidebar-empty-state">
                <i className="fa-solid fa-lock"></i>
                <p>Sign in to save and restore your conversations.</p>
                <button
                  className="sidebar-auth-cta"
                  onClick={() => openAuthModal("login")}
                >
                  Sign In
                </button>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="sidebar-empty-state">
                <i className="fa-regular fa-message"></i>
                <p>{searchQuery ? "No matching chats" : "No conversations yet"}</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.threadId === currThreadId;
                return (
                  <div
                    key={thread.threadId}
                    className={`thread-item ${isSelected ? "active" : ""}`}
                    onClick={() => switchThread(thread.threadId)}
                    title={thread.title || "New Chat"}
                  >
                    <i className="fa-regular fa-message thread-icon"></i>
                    <span className="thread-title">{thread.title || "New Chat"}</span>

                    <div className="thread-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="thread-action-btn"
                        onClick={() => setThreadToRename(thread)}
                        title="Rename Chat"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        className="thread-action-btn delete"
                        onClick={() => setThreadToDelete(thread)}
                        title="Delete Chat"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Profile & Navigation Footer */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className="user-profile-card">
              <div
                className="user-info-row"
                onClick={() => setSettingsModalOpen(true)}
                title="Open Settings"
              >
                <div className="user-avatar">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="user-meta">
                  <span className="user-name">{user.username}</span>
                  <span className={`user-role-pill role-${user.role}`}>
                    {user.role === "admin" ? "ADMIN" : "PRO"}
                  </span>
                </div>
                <i className="fa-solid fa-gear settings-icon"></i>
              </div>

              <div className="user-quick-actions">
                {isAdmin && (
                  <button
                    className="quick-btn admin-quick-btn"
                    onClick={() => setAdminModalOpen(true)}
                    title="Admin Dashboard"
                  >
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Admin</span>
                  </button>
                )}
                <button
                  className="quick-btn"
                  onClick={() => setSettingsModalOpen(true)}
                  title="Settings"
                >
                  <i className="fa-solid fa-sliders"></i>
                  <span>Settings</span>
                </button>
                <button
                  className="quick-btn logout-quick-btn"
                  onClick={logout}
                  title="Log Out"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="unauth-footer">
              <button
                className="primary-btn sidebar-login-btn"
                onClick={() => openAuthModal("login")}
              >
                <i className="fa-solid fa-right-to-bracket"></i> Sign In / Register
              </button>
            </div>
          )}

          <div className="sidebar-copyright">
            <span>SigmaGPT v2.0 Production</span>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!threadToDelete}
        title="Delete Conversation?"
        message={`Are you sure you want to delete "${threadToDelete?.title || "this chat"}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={() => {
          if (threadToDelete) {
            deleteThread(threadToDelete.threadId);
            setThreadToDelete(null);
          }
        }}
        onCancel={() => setThreadToDelete(null)}
      />

      {/* Rename Conversation Modal */}
      <RenameModal
        isOpen={!!threadToRename}
        initialTitle={threadToRename?.title}
        onRename={(newTitle) => {
          if (threadToRename) {
            renameThread(threadToRename.threadId, newTitle);
            setThreadToRename(null);
          }
        }}
        onClose={() => setThreadToRename(null)}
      />
    </>
  );
}
