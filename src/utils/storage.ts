import { CURRENCY_OPTIONS, type Budget, type Goal, type GoalContribution, type Invoice, type LedgerData, type Theme, type Transaction, type CurrencyCode } from "../types";

type LegacyLedgerData = Omit<LedgerData, "version" | "currency" | "baseCurrency"> & { version: 1 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.code === value);
}

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

function isTransaction(value: unknown): value is Transaction {
  return isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "income" || value.type === "expense") &&
    typeof value.category === "string" && value.category.length > 0 &&
    typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount > 0 &&
    typeof value.date === "string" && typeof value.notes === "string" &&
    Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string");
}

function isBudget(value: unknown): value is Budget {
  return isRecord(value) && typeof value.id === "string" && typeof value.category === "string" &&
    typeof value.limit === "number" && Number.isFinite(value.limit) && value.limit > 0;
}

function isGoal(value: unknown): value is Goal {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.targetAmount === "number" && Number.isFinite(value.targetAmount) && value.targetAmount > 0 &&
    typeof value.currentAmount === "number" && Number.isFinite(value.currentAmount) && value.currentAmount >= 0 &&
    typeof value.targetDate === "string";
}

function isContribution(value: unknown): value is GoalContribution {
  return isRecord(value) && typeof value.id === "string" && typeof value.goalId === "string" &&
    typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount > 0 &&
    typeof value.date === "string";
}

function isInvoice(value: unknown): value is Invoice {
  return isRecord(value) && typeof value.id === "string" && typeof value.client === "string" &&
    typeof value.description === "string" && typeof value.amount === "number" &&
    Number.isFinite(value.amount) && value.amount > 0 && typeof value.date === "string" &&
    (value.status === "Draft" || value.status === "Sent" || value.status === "Paid") &&
    (value.paidTransactionId === undefined || typeof value.paidTransactionId === "string");
}

function hasLedgerData(value: Record<string, unknown>): boolean {
  return isTheme(value.theme) &&
    typeof value.monthlyLimit === "number" && Number.isFinite(value.monthlyLimit) && value.monthlyLimit >= 0 &&
    Array.isArray(value.transactions) && value.transactions.every(isTransaction) &&
    Array.isArray(value.budgets) && value.budgets.every(isBudget) &&
    Array.isArray(value.goals) && value.goals.every(isGoal) &&
    Array.isArray(value.contributions) && value.contributions.every(isContribution) &&
    Array.isArray(value.invoices) && value.invoices.every(isInvoice);
}

export function isLedgerData(value: unknown): value is LedgerData {
  return isRecord(value) && value.version === 2 &&
    isCurrencyCode(value.currency) && isCurrencyCode(value.baseCurrency) &&
    hasLedgerData(value);
}

function isLegacyLedgerData(value: unknown): value is LegacyLedgerData {
  return isRecord(value) && value.version === 1 && hasLedgerData(value);
}

export function normalizeLedgerData(value: unknown): LedgerData | null {
  if (isLedgerData(value)) return value;
  if (isLegacyLedgerData(value)) {
    return { ...value, version: 2, currency: "PGK", baseCurrency: "USD" };
  }
  return null;
}
