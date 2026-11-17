import { createContext, useContext, type ReactNode } from "react";
import type { CurrencyCode } from "../types";
import { convertCurrency, type ExchangeRateSnapshot } from "../lib/exchangeRates";
import { compactCurrency, currency } from "../utils/format";

export interface MoneyContextValue {
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  rateVersion: string;
  toDisplay: (amount: number) => number;
  toBase: (amount: number) => number;
  format: (amount: number) => string;
  formatCompact: (amount: number) => string;
}

const MoneyContext = createContext<MoneyContextValue | null>(null);

export function createMoneyContext(
  baseCurrency: CurrencyCode,
  selectedCurrency: CurrencyCode,
  rates: ExchangeRateSnapshot | null,
): MoneyContextValue {
  const canConvert = selectedCurrency === baseCurrency ||
    Boolean(rates?.rates[baseCurrency] && rates.rates[selectedCurrency]);
  const displayCurrency = canConvert ? selectedCurrency : baseCurrency;
  const toDisplay = (amount: number) =>
    convertCurrency(amount, baseCurrency, displayCurrency, rates?.rates ?? null) ?? amount;
  const toBase = (amount: number) =>
    convertCurrency(amount, displayCurrency, baseCurrency, rates?.rates ?? null) ?? amount;

  return {
    currency: displayCurrency,
    baseCurrency,
    rateVersion: rates?.updatedAt ?? "",
    toDisplay,
    toBase,
    format: (amount) => currency(toDisplay(amount), displayCurrency),
    formatCompact: (amount) => compactCurrency(toDisplay(amount), displayCurrency),
  };
}

export function MoneyProvider({ value, children }: { value: MoneyContextValue; children: ReactNode }) {
  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney(): MoneyContextValue {
  const value = useContext(MoneyContext);
  if (!value) throw new Error("MoneyProvider is missing from this part of the application.");
  return value;
}
