import { ApiResponse, Block, Comment, NotificationItem, Page, PageRevision } from "@/types";
import api from "@/lib/axios";

export const pageService = {
  async list(workspaceId: number, parentId?: number): Promise<Page[]> {
    const { data } = await api.get<ApiResponse<Page[]>>("/pages", {
      params: { workspace_id: workspaceId, parent_id: parentId },
    });
    return data.data as Page[];
  },

  async favorites(workspaceId: number): Promise<Page[]> {
    const { data } = await api.get<ApiResponse<Page[]>>("/pages/favorites", {
      params: { workspace_id: workspaceId },
    });
    return data.data as Page[];
  },

  async trash(workspaceId: number): Promise<Page[]> {
    const { data } = await api.get<ApiResponse<Page[]>>("/pages/trash", {
      params: { workspace_id: workspaceId },
    });
    return data.data as Page[];
  },

  async get(id: number): Promise<Page> {
    const { data } = await api.get<ApiResponse<Page>>(`/pages/${id}`);
    return data.data as Page;
  },

  async create(workspaceId: number, payload: Partial<Page>): Promise<Page> {
    const { data } = await api.post<ApiResponse<Page>>("/pages", {
      workspace_id: workspaceId,
      ...payload,
    });
    return data.data as Page;
  },

  async update(id: number, payload: Partial<Page>): Promise<Page> {
    const { data } = await api.put<ApiResponse<Page>>(`/pages/${id}`, payload);
    return data.data as Page;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/pages/${id}`);
  },

  async restore(id: number): Promise<Page> {
    const { data } = await api.post<ApiResponse<Page>>(`/pages/${id}/restore`);
    return data.data as Page;
  },

  async history(id: number): Promise<PageRevision[]> {
    const { data } = await api.get<ApiResponse<PageRevision[]>>(`/pages/${id}/history`);
    return data.data as PageRevision[];
  },
};

export const commentService = {
  async list(pageId: number): Promise<Comment[]> {
    const { data } = await api.get<ApiResponse<Comment[]>>(`/pages/${pageId}/comments`);
    return data.data as Comment[];
  },

  async create(pageId: number, payload: { body: string; mentions?: string[] }): Promise<{ comments: Comment[] }> {
    const { data } = await api.post<ApiResponse<{ comments: Comment[] }>>(`/pages/${pageId}/comments`, payload);
    return data.data as { comments: Comment[] };
  },

  async listNotifications(): Promise<NotificationItem[]> {
    const { data } = await api.get<ApiResponse<NotificationItem[]>>("/notifications");
    return data.data as NotificationItem[];
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    const { data } = await api.post<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return data.data as NotificationItem;
  },
};

export const blockService = {
  async list(pageId: number): Promise<Block[]> {
    const { data } = await api.get<ApiResponse<Block[]>>("/blocks", {
      params: { page_id: pageId },
    });
    return data.data as Block[];
  },

  async create(payload: {
    page_id: number;
    type: string;
    content?: Record<string, unknown>;
    position?: number;
  }): Promise<Block> {
    const { data } = await api.post<ApiResponse<Block>>("/blocks", payload);
    return data.data as Block;
  },

  async update(id: number, payload: Partial<Block>): Promise<Block> {
    const { data } = await api.put<ApiResponse<Block>>(`/blocks/${id}`, payload);
    return data.data as Block;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/blocks/${id}`);
  },
};
