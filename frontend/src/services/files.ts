import { ApiResponse, FileItem } from "@/types";
import api from "@/lib/axios";

export const fileService = {
  async list(workspaceId: number): Promise<FileItem[]> {
    const { data } = await api.get<ApiResponse<FileItem[]>>("/files", {
      params: { workspace_id: workspaceId },
    });
    return (data.data as FileItem[]) || [];
  },

  async upload(workspaceId: number, file: File): Promise<FileItem> {
    const form = new FormData();
    form.append("workspace_id", String(workspaceId));
    form.append("file", file);
    const { data } = await api.post<ApiResponse<FileItem>>("/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data as FileItem;
  },

  async remove(workspaceId: number, fileId: number): Promise<void> {
    await api.delete(`/files/${fileId}`, { params: { workspace_id: workspaceId } });
  },

  async objectUrl(workspaceId: number, filename: string): Promise<string> {
    const { data } = await api.get<Blob>(`/files/${workspaceId}/${filename}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(data);
  },

  async download(workspaceId: number, filename: string, originalName?: string): Promise<void> {
    const { data } = await api.get<Blob>(`/files/${workspaceId}/${filename}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = originalName || filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
