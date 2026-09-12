import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="theme-toggle-inner">
        {isDark ? (
          <>
            <i className="fa-solid fa-sun theme-icon sun-icon"></i>
            <span className="theme-label">Light</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-moon theme-icon moon-icon"></i>
            <span className="theme-label">Dark</span>
          </>
        )}
      </div>
    </button>
  );
}
