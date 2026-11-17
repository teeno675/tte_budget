import { useEffect, useState } from "react";
import type { LedgerData } from "../types";
import { loadData, STORAGE_KEY } from "../utils/storage";

export function useLedger() {
  const [data, setData] = useState<LedgerData>(loadData);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch (error) {
      console.error("Unable to save LensLedger data to local storage.", error);
      setStorageError(true);
    }
  }, [data]);

  return { data, setData, storageError };
}
