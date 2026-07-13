import { useAuthStore } from "@/store/authStore";

/** Convenience hook exposing the Zustand auth store. */
export function useAuth() {
  return useAuthStore();
}
