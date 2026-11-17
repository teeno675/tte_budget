import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LedgerData } from "../types";
import { createDefaultData } from "../data/defaultData";
import { supabase } from "../lib/supabase";
import { isLedgerData } from "../utils/storage";

export function useLedger(userId: string): {
  data: LedgerData;
  setData: Dispatch<SetStateAction<LedgerData>>;
  loading: boolean;
  error: string | null;
  saveError: string | null;
  retry: () => void;
  flush: () => Promise<void>;
} {
  const [data, setData] = useState<LedgerData>(createDefaultData);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [saveRevision, setSaveRevision] = useState(0);
  const loadedRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const latestData = useRef(data);
  latestData.current = data;

  const retry = useCallback(() => {
    if (loadedRef.current && loadedUserId === userId && !loading && !error) {
      setSaveRevision((value) => value + 1);
      return;
    }

    loadedRef.current = false;
    setError(null);
    setLoading(true);
    setLoadRevision((value) => value + 1);
  }, [error, loadedUserId, loading, userId]);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase isn’t configured. Add your project URL and publishable key to continue.");
      setLoading(false);
      return;
    }
    let active = true;
    loadedRef.current = false;
    setLoading(true);

    async function loadLedger() {
      const { data: row, error: selectError } = await supabase!
        .from("user_ledgers")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;
      if (selectError) {
        console.error("Unable to load the account ledger.", selectError);
        setError("Your ledger couldn’t be loaded. Check your connection and try again.");
        setLoading(false);
        return;
      }

      if (row) {
        if (!isLedgerData(row.data)) {
          console.error("The saved account ledger has an invalid data shape.");
          setError("The saved ledger data is invalid. Contact support before changing this account.");
          setLoading(false);
          return;
        }
        setData(row.data);
      } else {
        const starter = createDefaultData();
        const { error: insertError } = await supabase!
          .from("user_ledgers")
          .insert({ user_id: userId, data: starter });
        if (!active) return;
        if (insertError) {
          console.error("Unable to initialize the account ledger.", insertError);
          setError("Your private ledger couldn’t be created. Check your database setup and try again.");
          setLoading(false);
          return;
        }
        setData(starter);
      }

      loadedRef.current = true;
      setLoadedUserId(userId);
      setError(null);
      setLoading(false);
    }

    void loadLedger().catch((loadError: unknown) => {
      if (!active) return;
      console.error("Unable to load the account ledger.", loadError);
      setError("Your ledger couldn’t be loaded. Check your connection and try again.");
      setLoading(false);
    });

    return () => {
      active = false;
      if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
    };
  }, [userId, loadRevision]);

  const persistLedger = useCallback(async () => {
    if (!supabase || !loadedRef.current || loadedUserId !== userId || loading || error) return false;
    try {
      const { data: row, error: updateError } = await supabase
        .from("user_ledgers")
        .update({ data: latestData.current, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("user_id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!row) throw new Error("The current account ledger could not be updated.");
      setSaveError(null);
      return true;
    } catch (saveError) {
      console.error("Unable to save the account ledger.", saveError);
      setSaveError("Your latest changes couldn’t be saved. Check your connection and retry.");
      return false;
    }
  }, [error, loadedUserId, loading, userId]);

  useEffect(() => {
    if (!supabase || !loadedRef.current || loadedUserId !== userId || loading || error) return;
    if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persistLedger(), 350);
    return () => {
      if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
    };
  }, [data, error, loadedUserId, loading, persistLedger, saveRevision, userId]);

  const flush = useCallback(async () => {
    if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
    const saved = await persistLedger();
    if (!saved) throw new Error("Your latest changes could not be confirmed as saved.");
  }, [persistLedger]);

  return { data, setData, loading: loading || loadedUserId !== userId, error, saveError, retry, flush };
}
