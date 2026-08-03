export interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  owner_id: number;
  created_at?: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: string;
  created_at?: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface FileItem {
  id: number;
  workspace_id: number;
  uploader_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at?: string;
}

export interface Invite {
  id: number;
  workspace_id: number;
  email: string;
  role: string;
  accepted: boolean;
  expires_at?: string;
}

export interface Page {
  id: number;
  workspace_id: number;
  parent_id?: number | null;
  title: string;
  icon?: string | null;
  cover_url?: string | null;
  content: Record<string, unknown>;
  is_favorite: boolean;
  is_deleted: boolean;
  position: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  children?: Page[];
}

export interface PageRevision {
  id: number;
  page_id: number;
  title: string;
  content: Record<string, unknown>;
  edited_by: number;
  created_at?: string;
}

export interface Comment {
  id: number;
  page_id: number;
  user_id: number;
  body: string;
  mentions: string[];
  created_at?: string;
  updated_at?: string;
  author?: {
    id: number;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  entity_type?: string | null;
  entity_id?: number | null;
  is_read: boolean;
  created_at?: string;
}

export interface Block {
  id: number;
  page_id: number;
  parent_block_id?: number | null;
  type: string;
  content: Record<string, unknown>;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export type PropertyType = "text" | "number" | "select" | "date" | "status";

export interface DatabaseProperty {
  id: number;
  database_id: number;
  name: string;
  type: PropertyType;
  options: { choices?: string[] };
  position: number;
}

export interface DatabaseItemValue {
  property_id: number;
  type: PropertyType;
  value: string | number | null;
}

export interface DatabaseItem {
  id: number;
  database_id: number;
  position: number;
  created_at?: string;
  values: Record<string, DatabaseItemValue>;
}

export interface Database {
  id: number;
  workspace_id: number;
  name: string;
  icon?: string | null;
  created_at?: string;
  properties: DatabaseProperty[];
  items?: DatabaseItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export interface AuthData {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface Presence {
  id: number;
  workspace_id: number;
  page_id: number;
  user_id: number;
  status: string;
  last_seen_at: string;
  user: {
    id: number;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface Activity {
  id: number;
  workspace_id: number;
  user_id: number;
  action: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  created_at: string;
  user: {
    id: number;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export const ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export type FilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "after"
  | "before";

export interface FilterRule {
  property_id: number;
  operator: FilterOperator;
  value?: string | number | null;
}

export type SortDirection = "asc" | "desc";

export interface SortRule {
  property_id: number;
  direction: SortDirection;
}

export type DatabaseViewMode = "grid" | "board";
