export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type Paginated<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export function listQuery(params?: {
  page?: number;
  limit?: number;
  status?: string;
  entryType?: string;
}) {
  const q = new URLSearchParams();
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.status) q.set("status", params.status);
  if (params?.entryType) q.set("entryType", params.entryType);
  const s = q.toString();
  return s ? `?${s}` : "";
}
