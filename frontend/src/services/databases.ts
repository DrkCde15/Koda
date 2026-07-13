import { ApiResponse, Database, DatabaseItem, DatabaseProperty } from "@/types";
import api from "@/lib/axios";

export interface CreateDatabasePayload {
  workspace_id: number;
  name: string;
  icon?: string;
  properties?: Array<{
    name: string;
    type: string;
    options?: { choices?: string[] };
    position?: number;
  }>;
}

export const databaseService = {
  async list(workspaceId: number): Promise<Database[]> {
    const { data } = await api.get<ApiResponse<Database[]>>(
      `/databases/workspace/${workspaceId}`
    );
    return (data.data as Database[]) || [];
  },

  async get(databaseId: number): Promise<Database> {
    const { data } = await api.get<ApiResponse<Database>>(`/databases/${databaseId}`);
    return data.data as Database;
  },

  async create(payload: CreateDatabasePayload): Promise<Database> {
    const { data } = await api.post<ApiResponse<Database>>("/databases", payload);
    return data.data as Database;
  },

  async update(
    databaseId: number,
    payload: { name?: string; icon?: string }
  ): Promise<Database> {
    const { data } = await api.put<ApiResponse<Database>>(
      `/databases/${databaseId}`,
      payload
    );
    return data.data as Database;
  },

  async remove(databaseId: number): Promise<void> {
    await api.delete(`/databases/${databaseId}`);
  },

  async addProperty(
    databaseId: number,
    payload: { name: string; type: string; options?: { choices?: string[] }; position?: number }
  ): Promise<DatabaseProperty> {
    const { data } = await api.post<ApiResponse<DatabaseProperty>>(
      `/databases/${databaseId}/properties`,
      payload
    );
    return data.data as DatabaseProperty;
  },

  async updateProperty(
    databaseId: number,
    propId: number,
    payload: { name?: string; type?: string; options?: { choices?: string[] }; position?: number }
  ): Promise<DatabaseProperty> {
    const { data } = await api.put<ApiResponse<DatabaseProperty>>(
      `/databases/${databaseId}/properties/${propId}`,
      payload
    );
    return data.data as DatabaseProperty;
  },

  async removeProperty(databaseId: number, propId: number): Promise<void> {
    await api.delete(`/databases/${databaseId}/properties/${propId}`);
  },

  async addItem(
    databaseId: number,
    values: Array<{ property_id: number; value: string | number | null }>,
    position?: number
  ): Promise<DatabaseItem> {
    const { data } = await api.post<ApiResponse<DatabaseItem>>(
      `/databases/${databaseId}/items`,
      { values, position }
    );
    return data.data as DatabaseItem;
  },

  async updateItem(
    databaseId: number,
    itemId: number,
    values?: Array<{ property_id: number; value: string | number | null }>,
    position?: number
  ): Promise<DatabaseItem> {
    const { data } = await api.put<ApiResponse<DatabaseItem>>(
      `/databases/${databaseId}/items/${itemId}`,
      { values, position }
    );
    return data.data as DatabaseItem;
  },

  async removeItem(databaseId: number, itemId: number): Promise<void> {
    await api.delete(`/databases/${databaseId}/items/${itemId}`);
  },
};

export const TASKS_PRESET: CreateDatabasePayload = {
  workspace_id: 0,
  name: "Tarefas",
  icon: "✅",
  properties: [
    { name: "Título", type: "text", position: 0 },
    {
      name: "Status",
      type: "status",
      position: 1,
      options: { choices: ["A fazer", "Em andamento", "Concluído"] },
    },
    { name: "Prazo", type: "date", position: 2 },
    { name: "Responsável", type: "text", position: 3 },
  ],
};
