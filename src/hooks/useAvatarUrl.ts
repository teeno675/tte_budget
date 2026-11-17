import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const signedUrlLifetimeSeconds = 24 * 60 * 60;

export function useAvatarUrl(user: User) {
  const avatarPath = typeof user.user_metadata.avatar_path === "string" ? user.user_metadata.avatar_path : "";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!avatarPath || !client) {
      setAvatarUrl(null);
      setError(false);
      return;
    }

    let active = true;
    const refresh = async () => {
      const { data, error: signedUrlError } = await client.storage
        .from("avatars")
        .createSignedUrl(avatarPath, signedUrlLifetimeSeconds);
      if (signedUrlError) throw signedUrlError;
      if (active) {
        setAvatarUrl(data.signedUrl);
        setError(false);
      }
    };

    void refresh().catch((loadError: unknown) => {
      if (!active) return;
      console.error("Unable to load the profile photo.", loadError);
      setAvatarUrl(null);
      setError(true);
    });

    const timer = window.setInterval(() => {
      void refresh().catch((loadError: unknown) => {
        if (!active) return;
        console.error("Unable to refresh the profile photo URL.", loadError);
        setAvatarUrl(null);
        setError(true);
      });
    }, signedUrlLifetimeSeconds * 1000 / 2);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [avatarPath]);

  return { avatarUrl, avatarError: error };
}
