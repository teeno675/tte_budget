import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseReady, supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseReady);
  const [recovery, setRecovery] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const clearJustSignedIn = useCallback(() => setJustSignedIn(false), []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Unable to restore the Supabase session.", error);
      setSession(data.session);
      setRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Unable to restore the Supabase session.", error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_IN") setJustSignedIn(true);
      if (event === "SIGNED_OUT") {
        setRecovery(false);
        setJustSignedIn(false);
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, recovery, configured: isSupabaseReady, justSignedIn, clearJustSignedIn };
}
