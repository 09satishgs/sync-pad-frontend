import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { ENDPOINTS } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";

export const useAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshSession } = useAuth();

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

  const [allDbRoles, setAllDbRoles] = useState([]);

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

      // Refresh admin session if workspace creator is self
      if (Number(workspaceCreatorId) === Number(user?.id)) {
        try {
          await refreshSession();
        } catch (err) {
          console.error("Auto-refresh admin session failed:", err);
        }
      }
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

      // Refresh admin session if workspace member is self
      if (Number(memberUserId) === Number(user?.id)) {
        try {
          await refreshSession();
        } catch (err) {
          console.error("Auto-refresh admin session failed:", err);
        }
      }
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

      // Refresh admin session if target user is self
      if (Number(selectedUser.id) === Number(user?.id)) {
        try {
          await refreshSession();
        } catch (err) {
          console.error("Auto-refresh admin session failed:", err);
        }
      }

      // Refresh local editing details
      setSelectedUser(null);
    } catch (err) {
      setRolesError(
        err.response?.data?.message || "Failed to update user roles.",
      );
    }
  };

  return {
    user,
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
  };
};
