import mongoose from "mongoose";

/** Standalone `mongod` (local dev) cannot use transactions — only replica set / Atlas. */
export function isTransactionNotSupportedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Transaction numbers are only allowed") ||
    msg.includes("replica set") ||
    msg.includes("mongos")
  );
}

/**
 * Runs `fn` inside a MongoDB transaction when the deployment supports it.
 * Falls back to non-transactional execution on standalone MongoDB (local dev).
 */
export async function runWithTransaction<T>(
  fn: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  if (process.env.MONGODB_DISABLE_TRANSACTIONS === "true") {
    return fn(undefined);
  }

  let session: mongoose.ClientSession | undefined;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }
    if (isTransactionNotSupportedError(err)) {
      return fn(undefined);
    }
    throw err;
  } finally {
    session?.endSession();
  }
}
