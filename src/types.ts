export type Theme = "dark" | "light";
export type TransactionType = "income" | "expense";
export type InvoiceStatus = "Draft" | "Sent" | "Paid";

export const CURRENCY_OPTIONS = [
  { code: "PGK", name: "Papua New Guinean kina" },
  { code: "USD", name: "US dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "JPY", name: "Japanese yen" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "FJD", name: "Fijian dollar" },
  { code: "PHP", name: "Philippine peso" },
  { code: "INR", name: "Indian rupee" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "KES", name: "Kenyan shilling" },
  { code: "ZAR", name: "South African rand" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

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
  version: 2;
  theme: Theme;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
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
