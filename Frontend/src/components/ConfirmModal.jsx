import React from "react";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-content confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-icon-row">
          <div className={`confirm-icon-circle ${isDestructive ? "destructive" : "info"}`}>
            <i className={`fa-solid ${isDestructive ? "fa-triangle-exclamation" : "fa-circle-question"}`}></i>
          </div>
          <h3>{title}</h3>
        </div>

        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button type="button" className="secondary-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={isDestructive ? "danger-btn" : "primary-btn"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
