import { ApiError, getErrorMessage, parseApiErrorBody } from "./errors";

export type ApiRequestOptions = RequestInit & {
  authOptional?: boolean;
};

export async function requestApi<T>(
  baseUrl: string,
  path: string,
  getHeaders: () => Record<string, string>,
  options?: ApiRequestOptions
): Promise<T> {
  const { authOptional, ...fetchOptions } = options ?? {};

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers: { ...getHeaders(), ...fetchOptions.headers },
    });

    const data =
      res.status === 204
        ? {}
        : await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = parseApiErrorBody(data, res.status, res.statusText);
      if (res.status === 401 && !authOptional) {
        localStorage.removeItem("adminToken");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?session=expired";
        }
      }
      throw err;
    }

    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(getErrorMessage(e), 0);
  }
}
