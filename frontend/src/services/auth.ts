import { ApiResponse, AuthData, Invite, User, Workspace, WorkspaceMember } from "@/types";
import api from "@/lib/axios";

export const authService = {
  async register(payload: {
    email: string;
    full_name: string;
    password: string;
  }): Promise<AuthData> {
    const { data } = await api.post<ApiResponse<AuthData>>("/auth/register", payload);
    return data.data as AuthData;
  },

  async login(payload: { email: string; password: string }): Promise<AuthData> {
    const { data } = await api.post<ApiResponse<AuthData>>("/auth/login", payload);
    return data.data as AuthData;
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiResponse<{ user: User }>>("/auth/me");
    return (data.data as { user: User }).user;
  },

  async forgotPassword(email: string): Promise<string | null> {
    const { data } = await api.post<ApiResponse<{ reset_token?: string }>>(
      "/auth/forgot-password",
      { email },
    );
    return data.data?.reset_token ?? null;
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await api.post("/auth/reset-password", { token, new_password });
  },

  async updateProfile(payload: {
    full_name?: string;
    avatar_url?: string;
  }): Promise<User> {
    const { data } = await api.put<ApiResponse<{ user: User }>>("/auth/profile", payload);
    return (data.data as { user: User }).user;
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post("/auth/change-password", { current_password, new_password });
  },
};

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get<ApiResponse<Workspace[]>>("/workspaces");
    return data.data as Workspace[];
  },

  async get(id: number): Promise<{ workspace: Workspace; members: WorkspaceMember[] }> {
    const { data } = await api.get<
      ApiResponse<{ workspace: Workspace; members: WorkspaceMember[] }>
    >(`/workspaces/${id}`);
    return data.data as { workspace: Workspace; members: WorkspaceMember[] };
  },

  async create(name: string, icon?: string): Promise<Workspace> {
    const { data } = await api.post<ApiResponse<Workspace>>("/workspaces", { name, icon });
    return data.data as Workspace;
  },

  async update(id: number, payload: { name?: string; icon?: string }): Promise<Workspace> {
    const { data } = await api.put<ApiResponse<Workspace>>(`/workspaces/${id}`, payload);
    return data.data as Workspace;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async createInvite(
    id: number,
    payload: { email: string; role: string },
  ): Promise<Invite> {
    const { data } = await api.post<ApiResponse<Invite>>(
      `/workspaces/${id}/invites`,
      payload,
    );
    return data.data as Invite;
  },

  async listInvites(id: number): Promise<Invite[]> {
    const { data } = await api.get<ApiResponse<Invite[]>>(`/workspaces/${id}/invites`);
    return (data.data as Invite[]) || [];
  },

  async deleteInvite(id: number, inviteId: number): Promise<void> {
    await api.delete(`/workspaces/${id}/invites/${inviteId}`);
  },

  async changeMemberRole(
    id: number,
    userId: number,
    role: string,
  ): Promise<WorkspaceMember> {
    const { data } = await api.put<ApiResponse<WorkspaceMember>>(
      `/workspaces/${id}/members/${userId}`,
      { role },
    );
    return data.data as WorkspaceMember;
  },

  async removeMember(id: number, userId: number): Promise<void> {
    await api.delete(`/workspaces/${id}/members/${userId}`);
  },

  async listMembers(id: number): Promise<WorkspaceMember[]> {
    const { data } = await api.get<ApiResponse<WorkspaceMember[]>>(`/workspaces/${id}/members`);
    return (data.data as WorkspaceMember[]) || [];
  },

  async acceptInvite(token: string): Promise<Workspace> {
    const { data } = await api.post<ApiResponse<Workspace>>("/workspaces/invites/accept", {
      token,
    });
    return data.data as Workspace;
  },
};
