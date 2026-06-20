import React from 'react';
import './Toast.css';

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <span className="toast-close" onClick={() => removeToast(toast.id)}>
            ✕
          </span>
        </div>
      ))}
    </div>
  );
};
export default ToastContainer;
