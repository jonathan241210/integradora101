import { useEffect, useState } from 'react';
import type { VisitorProfile } from '../repositories/authRepository';
import { accountSession } from '../session/accountSession';

export function useVisitorProfile() {
  const [profile, setProfile] = useState<VisitorProfile | null>(() => accountSession.peekProfile());
  const [loading, setLoading] = useState(() => accountSession.peekProfile() === null);

  useEffect(() => {
    let active = true;
    const cached = accountSession.peekProfile();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
      void accountSession.getProfile()
        .then((next) => {
          if (!active) return;
          setProfile(next);
        })
        .catch(() => {
          if (!active) return;
          setProfile(accountSession.peekProfile());
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    const unsubscribe = accountSession.subscribe(() => {
      if (!active) return;
      setProfile(accountSession.peekProfile());
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { profile, loading: loading && profile === null };
}
