import type { CurrencyCode } from "../types";

export const currency = (amount: number, code: CurrencyCode = "USD") => {
  if (code === "PGK") {
    const formatted = new Intl.NumberFormat("en-PG", { maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `-K${formatted}` : `K${formatted}`;
  }
  return new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);
};

export const currencyPrefix = (code: CurrencyCode) => {
  if (code === "PGK") return "K";
  return new Intl.NumberFormat("en", { style: "currency", currency: code })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? code;
};

export const compactCurrency = (amount: number, code: CurrencyCode) => {
  if (code === "PGK") {
    const formatted = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(amount));
    return amount < 0 ? `-K${formatted}` : `K${formatted}`;
  }
  return new Intl.NumberFormat("en", {
    style: "currency", currency: code, notation: "compact", maximumFractionDigits: 1,
  }).format(amount);
};

export const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));

export const monthLabel = (date = new Date()) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

export const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const todayString = () => dateString(new Date());

export const isCurrentMonth = (date: string, now = new Date()) => {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
};
