import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useChat } from "../MyContext";

export default function SettingsModal() {
  const { user, changePassword, logout } = useAuth();
  const { settingsModalOpen, setSettingsModalOpen } = useChat();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState("account"); // 'account' | 'security' | 'model'
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!settingsModalOpen || !user) return null;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await changePassword(currentPassword, newPassword);
      showSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSettingsModalOpen(false);
    showSuccess("Logged out successfully.");
  };

  return (
    <div className="modal-backdrop" onClick={() => setSettingsModalOpen(false)}>
      <div
        className="modal-content settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <i className="fa-solid fa-gear modal-icon"></i>
            <h2>Settings</h2>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setSettingsModalOpen(false)}
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="settings-layout">
          {/* Settings Navigation */}
          <div className="settings-nav">
            <button
              className={`settings-nav-btn ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <i className="fa-solid fa-user"></i>
              <span>Account</span>
            </button>
            <button
              className={`settings-nav-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <i className="fa-solid fa-lock"></i>
              <span>Security</span>
            </button>
            <button
              className={`settings-nav-btn ${activeTab === "model" ? "active" : ""}`}
              onClick={() => setActiveTab("model")}
            >
              <i className="fa-solid fa-brain"></i>
              <span>AI Model</span>
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="settings-body">
            {/* ================= ACCOUNT TAB ================= */}
            {activeTab === "account" && (
              <div className="settings-section">
                <h3>Account Information</h3>
                <div className="account-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Username</span>
                    <span className="detail-value">{user.username}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Account Role</span>
                    <span className={`badge badge-${user.role}`}>{user.role.toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`badge badge-${user.status}`}>{user.status.toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Member Since</span>
                    <span className="detail-value">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Login</span>
                    <span className="detail-value">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString()
                        : "Current Session"}
                    </span>
                  </div>
                </div>

                <div className="settings-divider"></div>

                <div className="settings-danger-zone">
                  <button type="button" className="secondary-btn logout-btn" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* ================= SECURITY TAB ================= */}
            {activeTab === "security" && (
              <div className="settings-section">
                <h3>Change Password</h3>
                <p className="settings-desc">
                  Update your password to keep your SigmaGPT account secure.
                </p>

                {errorMsg && (
                  <div className="auth-alert auth-alert-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="primary-btn submit-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ================= MODEL & PREFERENCES TAB ================= */}
            {activeTab === "model" && (
              <div className="settings-section">
                <h3>AI Model & Intelligence</h3>
                <div className="model-card">
                  <div className="model-card-header">
                    <div className="model-badge">Active Engine</div>
                    <h4>Google Gemini 3.6 Flash</h4>
                  </div>
                  <p className="model-desc">
                    SigmaGPT is powered by Google's real Gemini API with real-time SSE streaming,
                    intelligent conversation context memory, and markdown formatting.
                  </p>
                  <div className="model-specs">
                    <div className="spec-row">
                      <span>Max Context Tokens:</span>
                      <strong>2,048 tokens</strong>
                    </div>
                    <div className="spec-row">
                      <span>Streaming Protocol:</span>
                      <strong>Server-Sent Events (SSE)</strong>
                    </div>
                    <div className="spec-row">
                      <span>Syntax Highlighting:</span>
                      <strong>Rehype + Highlight.js</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
