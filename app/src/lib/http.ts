import { ApiError, getErrorMessage, parseApiErrorBody } from "./errors.js";

export type ApiRequestOptions = RequestInit & {
  /** Skip auto-redirect on 401 (login/register). */
  authOptional?: boolean;
  tokenKey?: "userToken";
};

export async function requestApi<T>(
  baseUrl: string,
  path: string,
  getHeaders: () => Record<string, string>,
  options?: ApiRequestOptions
): Promise<T> {
  const { authOptional, tokenKey: _tk, ...fetchOptions } = options ?? {};

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers: { ...getHeaders(), ...fetchOptions.headers },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = parseApiErrorBody(data, res.status, res.statusText);
      if (res.status === 401 && !authOptional) {
        localStorage.removeItem("userToken");
        const onAuthPage = window.location.pathname === "/login" || window.location.pathname === "/register";
        if (!onAuthPage) {
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
