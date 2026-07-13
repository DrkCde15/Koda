import { AxiosError } from "axios";
import { ApiResponse } from "@/types";

/** Extracts a human-readable message from an Axios error envelope. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof AxiosError) {
    const res = error.response?.data as ApiResponse | undefined;
    return res?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
