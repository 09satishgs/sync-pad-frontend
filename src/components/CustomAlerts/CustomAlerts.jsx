import React, { useState, useEffect, useRef } from "react";
import "./CustomAlerts.css";

let setDialogStateGlobal = null;

export const customAlert = (message, title = "Alert!!") => {
  return new Promise((resolve) => {
    if (setDialogStateGlobal) {
      setDialogStateGlobal({
        type: "alert",
        title,
        message,
        resolve,
      });
    } else {
      window.alert(message);
      resolve();
    }
  });
};

export const customConfirm = (message, title = "Confirmation") => {
  return new Promise((resolve) => {
    if (setDialogStateGlobal) {
      setDialogStateGlobal({
        type: "confirm",
        title,
        message,
        resolve,
      });
    } else {
      resolve(window.confirm(message));
    }
  });
};

export const customPrompt = (
  message,
  defaultValue = "",
  title = "Enter the Value",
) => {
  return new Promise((resolve) => {
    if (setDialogStateGlobal) {
      setDialogStateGlobal({
        type: "prompt",
        title,
        message,
        defaultValue,
        resolve,
      });
    } else {
      resolve(window.prompt(message, defaultValue));
    }
  });
};

export const CustomAlerts = () => {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setDialogStateGlobal = (d) => {
      setDialog(d);
      if (d && d.type === "prompt") {
        setInputValue(d.defaultValue || "");
      }
    };
    return () => {
      setDialogStateGlobal = null;
    };
  }, []);

  useEffect(() => {
    if (dialog && dialog.type === "prompt" && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [dialog]);

  // Handle keyboard events (Enter to submit, Escape to cancel)
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialog, inputValue]);

  const handleCancel = () => {
    if (!dialog) return;
    const resolver = dialog.resolve;
    setDialog(null);
    if (dialog.type === "confirm") {
      resolver(false);
    } else if (dialog.type === "prompt") {
      resolver(null);
    } else {
      resolver();
    }
  };

  const handleSubmit = () => {
    if (!dialog) return;
    const resolver = dialog.resolve;
    setDialog(null);
    if (dialog.type === "confirm") {
      resolver(true);
    } else if (dialog.type === "prompt") {
      resolver(inputValue);
    } else {
      resolver();
    }
  };

  if (!dialog) return null;

  return (
    <div className="modal-overlay custom-alerts-overlay" onClick={handleCancel}>
      <div
        className="modal custom-alerts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title custom-alerts-title">{dialog.title}</div>
        <div className="custom-alerts-body">{dialog.message}</div>
        {dialog.type === "prompt" && (
          <div className="custom-alerts-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="input-field custom-alerts-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}
        <div className="modal-actions custom-alerts-actions">
          {(dialog.type === "confirm" || dialog.type === "prompt") && (
            <button className="btn" onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit}>
            {dialog.type === "confirm" ? "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CustomAlerts;
