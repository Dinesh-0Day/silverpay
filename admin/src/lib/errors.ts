/** Parsed API / network error with HTTP status. */
export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSec?: number;

  constructor(message: string, status: number, retryAfterSec?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

function flattenZodLike(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  if (typeof e.fieldErrors === "object" && e.fieldErrors) {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(e.fieldErrors as Record<string, string[]>)) {
      if (Array.isArray(msgs) && msgs[0]) parts.push(`${field}: ${msgs[0]}`);
    }
    if (parts.length) return parts.join(" · ");
  }
  if (Array.isArray(e.formErrors) && (e.formErrors as string[])[0]) {
    return (e.formErrors as string[]).join(" · ");
  }
  return null;
}

export function parseApiErrorBody(data: unknown, status: number, statusText: string): ApiError {
  let message = "";
  let retryAfterSec: number | undefined;

  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string") message = d.error;
    else if (d.error) message = flattenZodLike(d.error) ?? "";
    if (typeof d.retryAfterSec === "number") retryAfterSec = d.retryAfterSec;
  }

  if (!message) {
    if (status === 401) message = "Session expired. Please sign in again.";
    else if (status === 403) message = "You do not have permission for this action.";
    else if (status === 404) message = "Not found.";
    else if (status === 429) message = "Too many attempts. Please wait.";
    else if (status >= 500) message = "Server error. Please try again later.";
    else message = statusText || "Request failed";
  }

  return new ApiError(message, status, retryAfterSec);
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      return "Network error. Check your connection and try again.";
    }
    return err.message || fallback;
  }
  if (typeof err === "string") return err;
  return fallback;
}
