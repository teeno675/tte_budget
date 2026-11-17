import { useCallback, useEffect, useState } from "react";
import { fetchExchangeRates, type ExchangeRateSnapshot } from "../lib/exchangeRates";

export function useExchangeRates() {
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await fetchExchangeRates());
    } catch (requestError) {
      console.error("Unable to refresh exchange rates.", requestError);
      setSnapshot(null);
      setError("Latest exchange rates are unavailable. Values are shown in your ledger’s base currency.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
