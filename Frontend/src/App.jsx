import React from "react";
import "./App.css";
import "./Modals.css";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import AuthModal from "./components/AuthModal";
import SettingsModal from "./components/SettingsModal";
import AdminDashboard from "./components/AdminDashboard";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatProvider } from "./MyContext";

function MainApp() {
  return (
    <div className="app-container">
      <Sidebar />
      <ChatWindow />
      <AuthModal />
      <SettingsModal />
      <AdminDashboard />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <MainApp />
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
