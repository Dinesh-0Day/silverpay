/* eslint-disable @typescript-eslint/no-explicit-any */

export function idStr(doc: { _id?: { toString(): string } } | null | undefined): string {
  return doc?._id?.toString() ?? "";
}

export function serialize<T = any>(doc: T | null | undefined): any {
  if (doc == null) return null;
  const obj = JSON.parse(JSON.stringify(doc));
  if (obj._id != null) {
    obj.id = String(obj._id);
    delete obj._id;
  }
  if (obj.__v !== undefined) delete obj.__v;
  return obj;
}

export function serializeUser(u: any) {
  if (!u) return null;
  const base = serialize(u);
  return {
    ...base,
    wallet: { balance: u.balance ?? 0, held: u.held ?? 0 },
  };
}

export function serializeList<T>(docs: T[]): any[] {
  return docs.map((d) => serialize(d));
}
