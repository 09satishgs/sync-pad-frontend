import React from "react";
import { HEADINGS } from "../../constants/headings";
import "./Modals.css";

export const WorkspaceInviteModal = ({
  showInviteModal,
  setShowInviteModal,
  inviteUsername,
  setInviteUsername,
  members = [],
  handleInviteMember,
  isMaintainer,
}) => {
  if (!showInviteModal) return null;

  const content = HEADINGS.MODALS.INVITE;

  return (
    <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
      <div
        className="modal"
        style={{ width: "450px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{content.TITLE}</div>

        {/* Member list section */}
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {content.MEMBER_LIST_HEADER}
          </div>
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-color)",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {members.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "center",
                  padding: "12px",
                }}
              >
                {content.NO_MEMBERS}
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={`${member.id}-${member.role_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    padding: "4px 6px",
                    borderRadius: "2px",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{member.username}</span>
                  <span
                    className={`badge ${member.access === "maintainer" ? "badge-live" : "badge-saved"}`}
                    style={{ fontSize: "9px", padding: "1px 4px" }}
                  >
                    {member.access === "maintainer"
                      ? content.MAINTAINER_BADGE
                      : content.MEMBER_BADGE}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite section */}
        {isMaintainer && (
          <form
            onSubmit={handleInviteMember}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "4px",
                }}
              >
                {content.ADD_MEMBER_LABEL}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: "32px" }}
                  placeholder={content.ADD_MEMBER_PLACEHOLDER}
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: "32px" }}
                >
                  {content.INVITE_BTN}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="modal-actions" style={{ marginTop: "12px" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowInviteModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default WorkspaceInviteModal;
