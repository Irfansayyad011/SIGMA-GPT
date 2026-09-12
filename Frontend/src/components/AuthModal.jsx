import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    login,
    register,
    forgotPassword,
    resetPassword,
    resetUsername,
    setResetUsername,
  } = useAuth();

  const { showSuccess, showError } = useToast();

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenHint, setTokenHint] = useState(null);

  if (!authModalOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Please enter both username and password.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await login(username.trim(), password);
      showSuccess(`Welcome back, ${username}!`);
      setUsername("");
      setPassword("");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await register(username.trim(), password);
      showSuccess(`Account created! Welcome, ${username}!`);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const userToReset = username.trim() || resetUsername.trim();
    if (!userToReset) {
      setErrorMsg("Please enter your username.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setTokenHint(null);
    try {
      const res = await forgotPassword(userToReset);
      showSuccess("Password reset instructions processed.");
      if (res.resetToken) {
        setTokenHint(res.resetToken);
        setResetToken(res.resetToken);
        setResetUsername(userToReset);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const userToReset = username.trim() || resetUsername.trim();
    if (!userToReset || !resetToken.trim() || !newPassword) {
      setErrorMsg("Please provide your username, reset token, and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await resetPassword(userToReset, resetToken.trim(), newPassword);
      showSuccess("Password successfully reset! Please log in.");
      setTokenHint(null);
      setAuthModalTab("login");
      setPassword("");
      setNewPassword("");
      setResetToken("");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div
        className="modal-content auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="auth-brand">
            <div className="brand-logo-circle">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h2>SigmaGPT</h2>
          </div>
          <button className="modal-close-btn" onClick={closeAuthModal} aria-label="Close modal">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${authModalTab === "login" ? "active" : ""}`}
            onClick={() => {
              setAuthModalTab("login");
              setErrorMsg("");
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${authModalTab === "register" ? "active" : ""}`}
            onClick={() => {
              setAuthModalTab("register");
              setErrorMsg("");
            }}
          >
            Create Account
          </button>
          <button
            className={`auth-tab-btn ${
              authModalTab === "forgot" || authModalTab === "reset" ? "active" : ""
            }`}
            onClick={() => {
              setAuthModalTab("forgot");
              setErrorMsg("");
            }}
          >
            Reset
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {authModalTab === "login" && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setAuthModalTab("forgot");
                    setResetUsername(username);
                    setErrorMsg("");
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon"></i>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Signing in...
                </>
              ) : (
                "Sign In to SigmaGPT"
              )}
            </button>

            <div className="auth-footer-hint">
              <span>Don't have an account?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAuthModalTab("register");
                  setErrorMsg("");
                }}
              >
                Create one now
              </button>
            </div>
          </form>
        )}

        {/* ================= REGISTER FORM ================= */}
        {authModalTab === "register" && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-username">Username</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  id="reg-username"
                  type="text"
                  placeholder="Choose a username (min 3 chars)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon"></i>
                <input
                  id="reg-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Create a secure password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm-password">Confirm Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-shield-halved input-icon"></i>
                <input
                  id="reg-confirm-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Creating Account...
                </>
              ) : (
                "Create Free Account"
              )}
            </button>

            <div className="auth-footer-hint">
              <span>Already registered?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAuthModalTab("login");
                  setErrorMsg("");
                }}
              >
                Sign in here
              </button>
            </div>
          </form>
        )}

        {/* ================= FORGOT PASSWORD ================= */}
        {authModalTab === "forgot" && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <p className="auth-description">
              Enter your username below. If an account exists, a secure single-use reset token will
              be generated.
            </p>

            <div className="form-group">
              <label htmlFor="forgot-user">Username</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  id="forgot-user"
                  type="text"
                  placeholder="Enter your username"
                  value={username || resetUsername}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setResetUsername(e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            {tokenHint && (
              <div className="token-hint-box">
                <div className="token-hint-header">
                  <i className="fa-solid fa-key"></i> Single-Use Reset Token
                </div>
                <div className="token-code-row">
                  <code>{tokenHint}</code>
                  <button
                    type="button"
                    className="copy-token-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(tokenHint);
                      showSuccess("Token copied to clipboard!");
                    }}
                  >
                    <i className="fa-solid fa-copy"></i> Copy
                  </button>
                </div>
                <button
                  type="button"
                  className="proceed-reset-btn"
                  onClick={() => setAuthModalTab("reset")}
                >
                  Proceed to Reset Password <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            )}

            {!tokenHint && (
              <button type="submit" className="primary-btn submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Generating...
                  </>
                ) : (
                  "Generate Reset Token"
                )}
              </button>
            )}

            <div className="auth-footer-hint">
              <span>Have a token already?</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAuthModalTab("reset");
                  setErrorMsg("");
                }}
              >
                Enter token here
              </button>
            </div>
          </form>
        )}

        {/* ================= RESET PASSWORD ================= */}
        {authModalTab === "reset" && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-user">Username</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  id="reset-user"
                  type="text"
                  placeholder="Enter username"
                  value={username || resetUsername}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setResetUsername(e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-tok">Reset Token</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-key input-icon"></i>
                <input
                  id="reset-tok"
                  type="text"
                  placeholder="Paste your reset token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-new-pass">New Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon"></i>
                <input
                  id="reset-new-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Resetting Password...
                </>
              ) : (
                "Save New Password"
              )}
            </button>

            <div className="auth-footer-hint">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAuthModalTab("login");
                  setErrorMsg("");
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
