import api from './apiClient';

export interface RoleDto {
  id: number;
  name: string;
  communityId?: number | null;
  permissions?: string[];
  userCount?: number;
}

export interface UserRoleSummary {
  id: number;
  fullName: string;
  email?: string;
  roles: string[];
  permissions?: string[];
}

export interface AssignRolesRequest {
  roles: string[];
}

const MOCK_ROLES: RoleDto[] = [
  { id: 1,  name: 'ADMIN',                   userCount: 2,  permissions: [] },
  { id: 2,  name: 'COMMUNITY_FEED_ADMIN',     userCount: 1,  permissions: [] },
  { id: 3,  name: 'SPORTS_ADMIN',             userCount: 1,  permissions: [] },
  { id: 4,  name: 'EVENTS_ADMIN',             userCount: 2,  permissions: [] },
  { id: 5,  name: 'FINANCE_MGMT_ADMIN',       userCount: 1,  permissions: [] },
  { id: 6,  name: 'HELPDESK_ADMIN',           userCount: 3,  permissions: [] },
  { id: 7,  name: 'MARKETPLACE_ADMIN',        userCount: 1,  permissions: [] },
  { id: 8,  name: 'MEMBER',                   userCount: 48, permissions: [] },
  { id: 9,  name: 'VENDOR',                   userCount: 5,  permissions: [] },
  { id: 10, name: 'USER',                     userCount: 12, permissions: [] },
];

export const roleManagementService = {
  async getRoles(): Promise<RoleDto[]> {
    try {
      const res = await api.get<RoleDto[]>('/roles');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return MOCK_ROLES;
  },

  async getRoleDetails(): Promise<RoleDto[]> {
    try {
      const res = await api.get<RoleDto[]>('/roles/details');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return MOCK_ROLES;
  },

  async createRole(name: string): Promise<RoleDto> {
    const res = await api.post<RoleDto>('/roles', { name: name.trim().toUpperCase() });
    return res.data;
  },

  async getUsersByRole(roleName: string): Promise<UserRoleSummary[]> {
    try {
      const res = await api.get<UserRoleSummary[]>(`/roles/${roleName}/users`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getUserRoles(userId: number): Promise<{ id: number; name: string }[]> {
    try {
      const res = await api.get<{ id: number; name: string }[]>(`/users/${userId}/roles`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async assignRoles(userId: number, roles: string[]): Promise<void> {
    await api.put(`/users/${userId}/role`, { roles });
  },
};

export default roleManagementService;
