import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { ENDPOINTS } from "../../constants/config";
import { HEADINGS } from "../../constants/headings";
import { useAuth } from "../../hooks/useAuth";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const headings = HEADINGS.ADMIN;
  const [activeSubTab, setActiveSubTab] = useState("db_explorer");

  // DB Explorer State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(15);
  const [loadingData, setLoadingData] = useState(false);
  const [dbError, setDbError] = useState("");

  // Users & Roles State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]); // [{ workspaceId, access }]
  const [rolesError, setRolesError] = useState("");
  const [rolesSuccess, setRolesSuccess] = useState("");

  // Workspaces State
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCreatorId, setWorkspaceCreatorId] = useState("");
  const [wsCreateError, setWsCreateError] = useState("");
  const [wsCreateSuccess, setWsCreateSuccess] = useState("");

  // Add Member State
  const [memberWorkspaceId, setMemberWorkspaceId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberAccess, setMemberAccess] = useState("member");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  // Dropdown states for role management
  const [roleWorkspaceId, setRoleWorkspaceId] = useState("");
  const [roleAccess, setRoleAccess] = useState("member");

  // Go to workspace redirect logic
  const handleGoToWorkspace = async () => {
    try {
      const res = await api.get(ENDPOINTS.WORKSPACES.LIST);
      if (res.data.length === 0) {
        alert("No workspaces found.");
      } else {
        localStorage.setItem("activeWorkspaceId", res.data[0].id);
        navigate("/workspace");
      }
    } catch (err) {
      console.error("Failed to query workspaces:", err);
      alert("Error querying workspaces.");
    }
  };

  // Load tables, users, workspaces on mount
  useEffect(() => {
    fetchTables();
    fetchUsers();
    fetchWorkspaces();
  }, []);

  // Reload table data when selection or page changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage);
    } else {
      setTableData([]);
    }
  }, [selectedTable, currentPage]);

  const fetchTables = async () => {
    try {
      const res = await api.get(ENDPOINTS.ADMIN.TABLES);
      setTables(res.data);
      if (res.data.length > 0) {
        setSelectedTable(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch DB tables:", err);
    }
  };

  const fetchTableData = async (tableName, page) => {
    setLoadingData(true);
    setDbError("");
    try {
      const res = await api.get(
        `${ENDPOINTS.ADMIN.TABLE_DETAIL(tableName)}?page=${page}&limit=${limit}`,
      );
      setTableData(res.data);
    } catch (err) {
      setDbError(
        err.response?.data?.message || "Failed to load table content.",
      );
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const res = await api.get(ENDPOINTS.ADMIN.USERS);
      setUsers(res.data);
      if (res.data.length > 0) {
        setWorkspaceCreatorId(res.data[0].id);
        setMemberUserId(res.data[0].id);
      }
    } catch (err) {
      setUsersError(err.response?.data?.message || "Failed to list users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get(ENDPOINTS.ADMIN.WORKSPACES);
      setWorkspaces(res.data);
      if (res.data.length > 0) {
        setMemberWorkspaceId(res.data[0].id);
        setRoleWorkspaceId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to list workspaces:", err);
    }
  };

  // Form Handlers
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setWsCreateError("");
    setWsCreateSuccess("");
    if (!workspaceName.trim() || !workspaceCreatorId) return;

    try {
      const res = await api.post(ENDPOINTS.ADMIN.WORKSPACES, {
        name: workspaceName.trim(),
        creatorId: Number(workspaceCreatorId),
      });
      setWsCreateSuccess(res.data.message || "Workspace created successfully!");
      setWorkspaceName("");
      fetchWorkspaces();
      fetchUsers(); // Roles updated in user list
    } catch (err) {
      setWsCreateError(
        err.response?.data?.message || "Failed to create workspace.",
      );
    }
  };

  const handleAddWorkspaceMember = async (e) => {
    e.preventDefault();
    setMemberError("");
    setMemberSuccess("");
    if (!memberWorkspaceId || !memberUserId) return;

    try {
      const res = await api.post(
        ENDPOINTS.ADMIN.WORKSPACE_MEMBERS(memberWorkspaceId),
        {
          userId: Number(memberUserId),
          access: memberAccess,
        },
      );
      setMemberSuccess(
        res.data.message || "User added to workspace successfully!",
      );
      fetchUsers(); // Roles updated in user list
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Failed to add workspace member.",
      );
    }
  };

  // User Roles Edit Handlers
  const startEditingRoles = (userObj) => {
    setSelectedUser(userObj);
    setRolesError("");
    setRolesSuccess("");
    loadAllRolesAndWorkspaces(userObj);
  };

  const [allDbRoles, setAllDbRoles] = useState([]);
  const loadAllRolesAndWorkspaces = async (userObj) => {
    try {
      // Fetch all roles from the DB table directly!
      const rolesRes = await api.get(
        `${ENDPOINTS.ADMIN.TABLE_DETAIL("roles")}?page=1&limit=500`,
      );
      setAllDbRoles(rolesRes.data);

      // Parse the user's role_ids
      const userRoleIds = userObj.role_ids
        ? userObj.role_ids.split(",").map(Number)
        : [];
      const userMappedRoles = userRoleIds
        .map((rid) => rolesRes.data.find((r) => r.role_id === rid))
        .filter(Boolean)
        .map((r) => ({
          workspaceId: r.workspace_id,
          access: r.access,
        }));

      setUserRoles(userMappedRoles);
    } catch (err) {
      console.error("Failed to map user roles:", err);
      setUserRoles([]);
    }
  };

  const handleAddRoleToUser = () => {
    if (!roleWorkspaceId) return;
    const exists = userRoles.some(
      (r) => r.workspaceId === Number(roleWorkspaceId),
    );
    if (exists) {
      setRolesError("User already has a role defined in this workspace.");
      return;
    }
    setRolesError("");
    setUserRoles((prev) => [
      ...prev,
      { workspaceId: Number(roleWorkspaceId), access: roleAccess },
    ]);
  };

  const handleRemoveRoleFromUser = (index) => {
    setUserRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveUserRoles = async () => {
    setRolesError("");
    setRolesSuccess("");
    try {
      const res = await api.put(ENDPOINTS.ADMIN.USER_ROLES(selectedUser.id), {
        roles: userRoles,
      });
      setRolesSuccess(res.data.message || "User roles updated successfully!");
      fetchUsers(); // Refresh users list
      // Refresh local editing details
      setSelectedUser(null);
    } catch (err) {
      setRolesError(
        err.response?.data?.message || "Failed to update user roles.",
      );
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div
        className="admin-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div className="admin-title">{headings.TITLE}</div>
          <div className="admin-subtitle">{headings.SUBTITLE}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-primary"
            onClick={handleGoToWorkspace}
            style={{ height: "36px", fontSize: "13px", cursor: "pointer" }}
          >
            💼 Go to Workspace
          </button>
          <button
            className="btn btn-danger"
            onClick={logout}
            style={{ height: "36px", fontSize: "13px", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <div
          className={`admin-tab ${activeSubTab === "db_explorer" ? "active" : ""}`}
          onClick={() => setActiveSubTab("db_explorer")}
        >
          {headings.TABS.DB_EXPLORER}
        </div>
        <div
          className={`admin-tab ${activeSubTab === "users_roles" ? "active" : ""}`}
          onClick={() => setActiveSubTab("users_roles")}
        >
          {headings.TABS.USERS_ROLES}
        </div>
        <div
          className={`admin-tab ${activeSubTab === "workspaces" ? "active" : ""}`}
          onClick={() => setActiveSubTab("workspaces")}
        >
          {headings.TABS.WORKSPACES}
        </div>
      </div>

      <div className="admin-content-section">
        {/* DATABASE EXPLORER TAB */}
        {activeSubTab === "db_explorer" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div className="admin-db-selector">
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {headings.DB.SELECT_TABLE}
              </label>
              <select
                className="select-type"
                style={{ width: "200px", height: "32px" }}
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {tables.map((t) => (
                  <option key={t} value={t}>
                    📄 {t}
                  </option>
                ))}
              </select>
            </div>

            {dbError && <div className="toast toast-error">{dbError}</div>}

            {loadingData ? (
              <div
                style={{
                  padding: "20px",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Loading table data...
              </div>
            ) : tableData.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                {headings.DB.NO_DATA}
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {Object.keys(tableData[0] || {}).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, idx) => (
                          <td key={idx}>
                            {val === null || val === undefined ? (
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                NULL
                              </span>
                            ) : typeof val === "object" ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="admin-pagination">
                  <span className="admin-pagination-info">
                    {headings.DB.PAGE_INFO(currentPage)}
                  </span>
                  <div className="admin-pagination-actions">
                    <button
                      className="btn"
                      style={{
                        height: "28px",
                        padding: "0 12px",
                        fontSize: "12px",
                      }}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      ◀ Prev Page
                    </button>
                    <button
                      className="btn"
                      style={{
                        height: "28px",
                        padding: "0 12px",
                        fontSize: "12px",
                      }}
                      disabled={tableData.length < limit}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next Page ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS & ROLES TAB */}
        {activeSubTab === "users_roles" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {usersError && (
              <div className="toast toast-error">{usersError}</div>
            )}

            {selectedUser ? (
              <div className="admin-card">
                <div className="admin-card-title">
                  {headings.USERS.EDIT_ROLES_TITLE(selectedUser.username)}
                </div>

                {rolesError && (
                  <div
                    className="toast toast-error"
                    style={{ marginBottom: "12px" }}
                  >
                    {rolesError}
                  </div>
                )}
                {rolesSuccess && (
                  <div
                    className="toast toast-success"
                    style={{ marginBottom: "12px" }}
                  >
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
                            workspaces.find((w) => w.id === r.workspaceId)
                              ?.name || `ID: ${r.workspaceId}`;
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
                            <span style={{ color: "var(--text-muted)" }}>
                              None
                            </span>
                          )}
                        </td>
                        <td>
                          {u.created_at
                            ? new Date(u.created_at).toLocaleString()
                            : "N/A"}
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
        )}

        {/* WORKSPACES MANAGER TAB */}
        {activeSubTab === "workspaces" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div className="admin-form-row">
              {/* Create Workspace */}
              <div className="admin-card">
                <div className="admin-card-title">
                  {headings.WORKSPACES.CREATE_TITLE}
                </div>
                {wsCreateError && (
                  <div
                    className="toast toast-error"
                    style={{ marginBottom: "12px" }}
                  >
                    {wsCreateError}
                  </div>
                )}
                {wsCreateSuccess && (
                  <div
                    className="toast toast-success"
                    style={{ marginBottom: "12px" }}
                  >
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
                  <div
                    className="toast toast-error"
                    style={{ marginBottom: "12px" }}
                  >
                    {memberError}
                  </div>
                )}
                {memberSuccess && (
                  <div
                    className="toast toast-success"
                    style={{ marginBottom: "12px" }}
                  >
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
        )}
      </div>
    </div>
  );
}
