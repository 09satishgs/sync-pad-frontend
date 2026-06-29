import React from "react";
import { Briefcase } from "lucide-react";
import { HEADINGS } from "../../constants/headings";
import { useAdminDashboard } from "./useAdminDashboard";
import DbExplorer from "./components/DbExplorer";
import UsersRolesManager from "./components/UsersRolesManager";
import WorkspacesManager from "./components/WorkspacesManager";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const {
    logout,
    activeSubTab,
    setActiveSubTab,
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    currentPage,
    setCurrentPage,
    limit,
    loadingData,
    dbError,
    users,
    loadingUsers,
    usersError,
    selectedUser,
    setSelectedUser,
    userRoles,
    rolesError,
    rolesSuccess,
    workspaces,
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
    roleWorkspaceId,
    setRoleWorkspaceId,
    roleAccess,
    setRoleAccess,
    handleGoToWorkspace,
    handleCreateWorkspace,
    handleAddWorkspaceMember,
    startEditingRoles,
    handleAddRoleToUser,
    handleRemoveRoleFromUser,
    handleSaveUserRoles,
  } = useAdminDashboard();

  const headings = HEADINGS.ADMIN;

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
        <div className="flex-align flex-gap-4">
          <button
            className="btn btn-primary admin-btn-primary"
            onClick={handleGoToWorkspace}
          >
            <Briefcase size={14} /> Go to Workspace
          </button>
          <button
            className="btn btn-danger admin-btn-danger"
            onClick={logout}
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
          <DbExplorer
            tables={tables}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            tableData={tableData}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            limit={limit}
            loadingData={loadingData}
            dbError={dbError}
            headings={headings}
          />
        )}

        {/* USERS & ROLES TAB */}
        {activeSubTab === "users_roles" && (
          <UsersRolesManager
            users={users}
            loadingUsers={loadingUsers}
            usersError={usersError}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            userRoles={userRoles}
            rolesError={rolesError}
            rolesSuccess={rolesSuccess}
            roleWorkspaceId={roleWorkspaceId}
            setRoleWorkspaceId={setRoleWorkspaceId}
            roleAccess={roleAccess}
            setRoleAccess={setRoleAccess}
            workspaces={workspaces}
            startEditingRoles={startEditingRoles}
            handleAddRoleToUser={handleAddRoleToUser}
            handleRemoveRoleFromUser={handleRemoveRoleFromUser}
            handleSaveUserRoles={handleSaveUserRoles}
            headings={headings}
          />
        )}

        {/* WORKSPACES MANAGER TAB */}
        {activeSubTab === "workspaces" && (
          <WorkspacesManager
            workspaces={workspaces}
            users={users}
            workspaceName={workspaceName}
            setWorkspaceName={setWorkspaceName}
            workspaceCreatorId={workspaceCreatorId}
            setWorkspaceCreatorId={setWorkspaceCreatorId}
            wsCreateError={wsCreateError}
            wsCreateSuccess={wsCreateSuccess}
            memberWorkspaceId={memberWorkspaceId}
            setMemberWorkspaceId={setMemberWorkspaceId}
            memberUserId={memberUserId}
            setMemberUserId={setMemberUserId}
            memberAccess={memberAccess}
            setMemberAccess={setMemberAccess}
            memberError={memberError}
            memberSuccess={memberSuccess}
            handleCreateWorkspace={handleCreateWorkspace}
            handleAddWorkspaceMember={handleAddWorkspaceMember}
            headings={headings}
          />
        )}
      </div>
    </div>
  );
}
