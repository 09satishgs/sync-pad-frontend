import React from "react";

export const WorkspacesManager = ({
  workspaces,
  users,
  workspaceName,
  setWorkspaceName,
  workspaceCreatorId,
  setWorkspaceCreatorId,
  wsCreateError,
  wsCreateSuccess,
  memberWorkspaceId,
  setMemberWorkspaceId,
  memberUserId,
  setMemberUserId,
  memberAccess,
  setMemberAccess,
  memberError,
  memberSuccess,
  handleCreateWorkspace,
  handleAddWorkspaceMember,
  headings,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="admin-form-row">
        {/* Create Workspace */}
        <div className="admin-card">
          <div className="admin-card-title">
            {headings.WORKSPACES.CREATE_TITLE}
          </div>
          {wsCreateError && (
            <div className="toast toast-error" style={{ marginBottom: "12px" }}>
              {wsCreateError}
            </div>
          )}
          {wsCreateSuccess && (
            <div className="toast toast-success" style={{ marginBottom: "12px" }}>
              {wsCreateSuccess}
            </div>
          )}

          <form onSubmit={handleCreateWorkspace}>
            <div className="admin-form-group">
              <label>Workspace Name</label>
              <input
                type="text"
                className="input-field"
                style={{ height: "32px" }}
                placeholder="e.g. Engineering Team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>{headings.WORKSPACES.CREATE_OWNER_LABEL}</label>
              <select
                className="select-type"
                style={{ height: "32px" }}
                value={workspaceCreatorId}
                onChange={(e) => setWorkspaceCreatorId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} (ID: {u.id})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "32px", marginTop: "8px" }}
            >
              Create Workspace
            </button>
          </form>
        </div>

        {/* Add Workspace Member */}
        <div className="admin-card">
          <div className="admin-card-title">
            {headings.WORKSPACES.ADD_MEMBER_TITLE}
          </div>
          {memberError && (
            <div className="toast toast-error" style={{ marginBottom: "12px" }}>
              {memberError}
            </div>
          )}
          {memberSuccess && (
            <div className="toast toast-success" style={{ marginBottom: "12px" }}>
              {memberSuccess}
            </div>
          )}

          <form onSubmit={handleAddWorkspaceMember}>
            <div className="admin-form-group">
              <label>Select Workspace</label>
              <select
                className="select-type"
                style={{ height: "32px" }}
                value={memberWorkspaceId}
                onChange={(e) => setMemberWorkspaceId(e.target.value)}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Select User</label>
              <select
                className="select-type"
                style={{ height: "32px" }}
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} (ID: {u.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Access Role Level</label>
              <select
                className="select-type"
                style={{ height: "32px" }}
                value={memberAccess}
                onChange={(e) => setMemberAccess(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="maintainer">Maintainer</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "32px", marginTop: "8px" }}
            >
              Add User to Workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkspacesManager;
