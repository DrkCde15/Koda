import { AxiosError } from "axios";
import { ApiResponse } from "@/types";

/** Extracts a human-readable message from an Axios error envelope. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof AxiosError) {
    const res = error.response?.data as ApiResponse | undefined;
    if (res?.errors && typeof res.errors === "object") {
      const details = Object.entries(res.errors as Record<string, unknown>)
        .map(([field, messages]) => {
          const text = Array.isArray(messages) ? messages.join(", ") : String(messages);
          return `${field}: ${text}`;
        })
        .join("; ");
      if (details) return `${res.message ?? "Validation failed"}: ${details}`;
    }
    return res?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
