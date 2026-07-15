import { ApiResponse, Page } from "@/types";
import api from "@/lib/axios";

export const searchService = {
  async search(workspaceId: number, query: string): Promise<Page[]> {
    const { data } = await api.get<ApiResponse<Page[]>>("/search", {
      params: { workspace_id: workspaceId, q: query },
    });
    return (data.data as Page[]) || [];
  },
};
