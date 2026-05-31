import { INDIAN_NAMES } from "../data/indianNames";

export type LiveTransactionKind = "deposit" | "withdraw";

export type LiveTransaction = {
  id: string;
  name: string;
  kind: LiveTransactionKind;
  amount: number;
  ago: string;
};

const AMOUNTS = [
  300, 500, 750, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7500, 8000, 10000, 12000,
  15000, 18000, 20000, 25000, 30000, 35000, 50000, 75000, 100000,
];

const AGO_LABELS = [
  "Just now",
  "Just now",
  "1 min ago",
  "1 min ago",
  "2 mins ago",
  "2 mins ago",
  "3 mins ago",
  "4 mins ago",
  "5 mins ago",
];

let txnCounter = 0;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomAmount() {
  return pick(AMOUNTS);
}

export function createRandomLiveTransaction(): LiveTransaction {
  txnCounter += 1;
  return {
    id: `live-${Date.now()}-${txnCounter}`,
    name: pick(INDIAN_NAMES),
    kind: Math.random() < 0.52 ? "deposit" : "withdraw",
    amount: randomAmount(),
    ago: pick(AGO_LABELS),
  };
}

export function createLiveTransactionBatch(count = 10): LiveTransaction[] {
  const batch: LiveTransaction[] = [];
  const usedNames = new Set<string>();
  let attempts = 0;
  while (batch.length < count && attempts < count * 8) {
    attempts += 1;
    const txn = createRandomLiveTransaction();
    if (usedNames.has(txn.name)) continue;
    usedNames.add(txn.name);
    batch.push(txn);
  }
  while (batch.length < count) {
    batch.push(createRandomLiveTransaction());
  }
  return batch;
}
