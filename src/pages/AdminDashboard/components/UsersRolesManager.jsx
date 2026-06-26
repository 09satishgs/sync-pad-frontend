import React from "react";

export const UsersRolesManager = ({
  users,
  loadingUsers,
  usersError,
  selectedUser,
  setSelectedUser,
  userRoles,
  rolesError,
  rolesSuccess,
  roleWorkspaceId,
  setRoleWorkspaceId,
  roleAccess,
  setRoleAccess,
  workspaces,
  startEditingRoles,
  handleAddRoleToUser,
  handleRemoveRoleFromUser,
  handleSaveUserRoles,
  headings,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {usersError && <div className="toast toast-error">{usersError}</div>}

      {selectedUser ? (
        <div className="admin-card">
          <div className="admin-card-title">
            {headings.USERS.EDIT_ROLES_TITLE(selectedUser.username)}
          </div>

          {rolesError && (
            <div className="toast toast-error" style={{ marginBottom: "12px" }}>
              {rolesError}
            </div>
          )}
          {rolesSuccess && (
            <div className="toast toast-success" style={{ marginBottom: "12px" }}>
              {rolesSuccess}
            </div>
          )}

          <div className="admin-roles-manager">
            {/* Left column: Current roles */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                }}
              >
                {headings.USERS.ROLES_LIST_HEADER}
              </div>
              <div className="user-roles-list">
                {userRoles.length === 0 ? (
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    No roles assigned.
                  </div>
                ) : (
                  userRoles.map((r, idx) => {
                    const wsName =
                      workspaces.find((w) => w.id === r.workspaceId)?.name ||
                      `ID: ${r.workspaceId}`;
                    return (
                      <div key={idx} className="user-role-item">
                        <span>
                          💼 <strong>{wsName}</strong> ({r.access})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleFromUser(idx)}
                          title="Remove role"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right column: Add role */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                }}
              >
                {headings.USERS.ADD_ROLE_HEADER}
              </div>
              <div className="add-role-box">
                <div className="admin-form-group">
                  <label>{headings.USERS.WORKSPACE_LABEL}</label>
                  <select
                    className="select-type"
                    style={{ height: "32px" }}
                    value={roleWorkspaceId}
                    onChange={(e) => setRoleWorkspaceId(e.target.value)}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>{headings.USERS.ROLE_LABEL}</label>
                  <select
                    className="select-type"
                    style={{ height: "32px" }}
                    value={roleAccess}
                    onChange={(e) => setRoleAccess(e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="maintainer">Maintainer</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: "100%",
                    height: "32px",
                    marginTop: "4px",
                  }}
                  onClick={handleAddRoleToUser}
                >
                  + Add Role to List
                </button>
              </div>

              <div className="roles-action-bar">
                <button
                  type="button"
                  className="btn"
                  style={{ height: "32px", padding: "0 16px" }}
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: "32px", padding: "0 16px" }}
                  onClick={handleSaveUserRoles}
                >
                  {headings.USERS.SAVE_ROLES_BTN}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Roles Assigned</th>
                <th>Registered At</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    {u.role_ids ? (
                      <span style={{ color: "var(--accent-color)" }}>
                        {u.role_ids.split(",").length} roles
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>None</span>
                    )}
                  </td>
                  <td>
                    {u.created_at ? new Date(u.created_at).toLocaleString() : "N/A"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        height: "26px",
                        padding: "0 8px",
                        fontSize: "11px",
                      }}
                      onClick={() => startEditingRoles(u)}
                    >
                      ✏️ Edit Roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersRolesManager;
