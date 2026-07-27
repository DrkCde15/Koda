import { Activity, ApiResponse, Presence } from "@/types";
import api from "@/lib/axios";

export const activityService = {
  async setPresence(pageId: number, status = "online"): Promise<Presence> {
    const { data } = await api.post<ApiResponse<Presence>>(`/pages/${pageId}/presence`, { status });
    return data.data as Presence;
  },

  async listPresence(workspaceId: number): Promise<Presence[]> {
    const { data } = await api.get<ApiResponse<Presence[]>>(`/workspaces/${workspaceId}/presence`);
    return data.data as Presence[];
  },

  async listActivity(workspaceId: number): Promise<Activity[]> {
    const { data } = await api.get<ApiResponse<Activity[]>>(`/workspaces/${workspaceId}/activity`);
    return data.data as Activity[];
  },
};
