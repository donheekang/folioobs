import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Generic data-loading hook with loading/error states.
 * Currently resolves instantly with local data.
 * When API is ready, switch `fetcher` to api.getXxx().
 *
 * Usage:
 *   const { data, loading, error, refetch } = useDataLoader(
 *     () => localData,        // swap to () => api.getInvestors()
 *     [dependency],
 *   );
 */
export function useDataLoader(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await Promise.resolve(fetcher());
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: err });
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { ...state, refetch: load };
}

export default useDataLoader;
