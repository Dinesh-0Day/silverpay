import mongoose from "mongoose";
import { LedgerEntry, User, type LedgerType } from "../models/index.js";

export async function creditWallet(
  userId: string,
  amount: number,
  type: LedgerType,
  referenceId?: string,
  note?: string,
  session?: mongoose.ClientSession
) {
  const user = await User.findById(userId).session(session ?? null);
  if (!user) throw new Error("User not found");
  const balanceAfter = user.balance + amount;
  user.balance = balanceAfter;
  await user.save({ session: session ?? undefined });
  await LedgerEntry.create(
    [{ userId, type, amount, balanceAfter, referenceId, note }],
    { session: session ?? undefined }
  );
  return balanceAfter;
}

export async function holdFunds(userId: string, amount: number, session?: mongoose.ClientSession) {
  const user = await User.findById(userId).session(session ?? null);
  if (!user) throw new Error("User not found");
  const available = user.balance - user.held;
  if (available < amount) throw new Error("Insufficient balance");
  user.held += amount;
  await user.save({ session: session ?? undefined });
}

export async function releaseHold(userId: string, amount: number, session?: mongoose.ClientSession) {
  const user = await User.findById(userId).session(session ?? null);
  if (!user) throw new Error("User not found");
  user.held = Math.max(0, user.held - amount);
  await user.save({ session: session ?? undefined });
}

/** Debit available balance (admin paid user externally — e.g. after plan purchase credit). */
export async function debitWallet(
  userId: string,
  amount: number,
  type: LedgerType,
  referenceId?: string,
  note?: string,
  session?: mongoose.ClientSession
) {
  const user = await User.findById(userId).session(session ?? null);
  if (!user) throw new Error("User not found");
  const available = user.balance - user.held;
  if (amount > available + 0.001) {
    throw new Error(`Insufficient balance. Available ₹${available.toFixed(2)}`);
  }
  const balanceAfter = Math.round((user.balance - amount) * 100) / 100;
  user.balance = balanceAfter;
  await user.save({ session: session ?? undefined });
  await LedgerEntry.create(
    [{ userId, type, amount: -amount, balanceAfter, referenceId, note }],
    { session: session ?? undefined }
  );
  return balanceAfter;
}

export function calcBonus(price: number, bonusPercent: number, bonusFixed: number) {
  const fromPercent = (price * bonusPercent) / 100;
  return Math.round((fromPercent + bonusFixed) * 100) / 100;
}

export function generateOrderNo() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function generateUid() {
  return String(100000 + Math.floor(Math.random() * 900000));
}
