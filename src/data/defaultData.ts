import type { LedgerData } from "../types";

export function createDefaultData(): LedgerData {
  return {
    version: 2,
    theme: "dark",
    currency: "PGK",
    baseCurrency: "PGK",
    monthlyLimit: 0,
    transactions: [],
    budgets: [],
    goals: [],
    contributions: [],
    invoices: [],
  };
}
