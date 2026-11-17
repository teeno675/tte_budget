export type Theme = "dark" | "light";
export type TransactionType = "income" | "expense";
export type InvoiceStatus = "Draft" | "Sent" | "Paid";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  notes: string;
  tags: string[];
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
}

export interface Invoice {
  id: string;
  client: string;
  description: string;
  amount: number;
  date: string;
  status: InvoiceStatus;
  paidTransactionId?: string;
}

export interface LedgerData {
  version: 1;
  theme: Theme;
  monthlyLimit: number;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  contributions: GoalContribution[];
  invoices: Invoice[];
}

export type Page = "dashboard" | "transactions" | "budgets" | "goals" | "reports" | "invoices" | "settings";

export const INCOME_CATEGORIES = ["Client Sessions", "Weddings", "Commercial", "Prints", "Workshops", "Other"];
export const EXPENSE_CATEGORIES = ["Gear", "Software", "Travel", "Marketing", "Studio", "Props", "Education", "Personal", "Other"];
