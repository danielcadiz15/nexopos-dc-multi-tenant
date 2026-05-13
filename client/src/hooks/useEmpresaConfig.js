import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

/**
 * companies/{orgId}/config/empresa (solo lectura; cache en estado local).
 */
export default function useEmpresaConfig() {
  const { orgId } = useAuth();
  const [empresaConfig, setEmpresaConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgId) {
        setEmpresaConfig(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, `companies/${orgId}/config/empresa`));
        if (!cancelled) {
          setEmpresaConfig(snap.exists() ? snap.data() : null);
        }
      } catch {
        if (!cancelled) setEmpresaConfig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return { empresaConfig, loading };
}
