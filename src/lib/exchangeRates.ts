import { CURRENCY_OPTIONS, type CurrencyCode } from "../types";

export interface ExchangeRateSnapshot {
  rates: Partial<Record<CurrencyCode, number>>;
  updatedAt: string;
}

const exchangeRateUrl = "https://open.er-api.com/v6/latest/PGK";

export async function fetchExchangeRates(): Promise<ExchangeRateSnapshot> {
  const response = await fetch(exchangeRateUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Exchange-rate service returned invalid data.");
  const result = payload as { result?: unknown; base_code?: unknown; time_last_update_utc?: unknown; rates?: unknown };
  if (result.result !== "success" || result.base_code !== "PGK" ||
      typeof result.time_last_update_utc !== "string" ||
      !Number.isFinite(Date.parse(result.time_last_update_utc)) ||
      !result.rates || typeof result.rates !== "object") {
    throw new Error("Exchange-rate service returned an unsupported response.");
  }

  const sourceRates = result.rates as Record<string, unknown>;
  const rates: Partial<Record<CurrencyCode, number>> = {};
  for (const { code } of CURRENCY_OPTIONS) {
    const rate = sourceRates[code];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Exchange-rate service did not provide a valid ${code} rate.`);
    }
    rates[code] = rate;
  }

  return { rates, updatedAt: result.time_last_update_utc };
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Partial<Record<CurrencyCode, number>> | null,
): number | null {
  if (from === to) return amount;
  const sourceRate = rates?.[from];
  const targetRate = rates?.[to];
  if (!sourceRate || !targetRate) return null;
  const converted = amount / sourceRate * targetRate;
  return Number.isFinite(converted) ? converted : null;
}
