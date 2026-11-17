import { createDefaultData } from "../data/defaultData";
import type { LedgerData } from "../types";

export const STORAGE_KEY = "lensledger-data";

export function loadData(): LedgerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed: unknown = JSON.parse(raw);
    if (isLedgerData(parsed)) return parsed;
    console.error("LensLedger data is invalid; loading sample data instead.");
  } catch (error) {
    console.error("Unable to load LensLedger data from local storage.", error);
  }
  return createDefaultData();
}

export function isLedgerData(value: unknown): value is LedgerData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<LedgerData>;
  return data.version === 1 &&
    (data.theme === "dark" || data.theme === "light") &&
    typeof data.monthlyLimit === "number" && Number.isFinite(data.monthlyLimit) && data.monthlyLimit >= 0 &&
    Array.isArray(data.transactions) && data.transactions.every((item) =>
      typeof item?.id === "string" && (item.type === "income" || item.type === "expense") &&
      typeof item.category === "string" && item.category.length > 0 &&
      typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.date === "string" && typeof item.notes === "string" &&
      Array.isArray(item.tags) && item.tags.every((tag) => typeof tag === "string")) &&
    Array.isArray(data.budgets) && data.budgets.every((item) =>
      typeof item?.id === "string" && typeof item.category === "string" &&
      typeof item.limit === "number" && Number.isFinite(item.limit) && item.limit > 0) &&
    Array.isArray(data.goals) && data.goals.every((item) =>
      typeof item?.id === "string" && typeof item.name === "string" &&
      typeof item.targetAmount === "number" && Number.isFinite(item.targetAmount) && item.targetAmount > 0 &&
      typeof item.currentAmount === "number" && Number.isFinite(item.currentAmount) && item.currentAmount >= 0 &&
      typeof item.targetDate === "string") &&
    Array.isArray(data.contributions) && data.contributions.every((item) =>
      typeof item?.id === "string" && typeof item.goalId === "string" &&
      typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.date === "string") &&
    Array.isArray(data.invoices) && data.invoices.every((item) =>
      typeof item?.id === "string" && typeof item.client === "string" &&
      typeof item.description === "string" && typeof item.amount === "number" &&
      Number.isFinite(item.amount) && item.amount > 0 && typeof item.date === "string" &&
      (item.status === "Draft" || item.status === "Sent" || item.status === "Paid") &&
      (item.paidTransactionId === undefined || typeof item.paidTransactionId === "string"));
}
