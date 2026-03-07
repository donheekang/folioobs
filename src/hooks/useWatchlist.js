import { useState, useCallback, useEffect } from "react";
import { safeGetJSON, safeSetItem } from "../utils/storage";

export const useWatchlist = () => {
  const [watchInvestors, setWatchInvestors] = useState(() => safeGetJSON('fo_watchInv', []));
  const [watchTickers, setWatchTickers] = useState(() => safeGetJSON('fo_watchTkr', []));

  useEffect(() => { safeSetItem('fo_watchInv', watchInvestors); }, [watchInvestors]);
  useEffect(() => { safeSetItem('fo_watchTkr', watchTickers); }, [watchTickers]);

  const toggleInvestor = useCallback((id) => setWatchInvestors(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);
  const toggleTicker = useCallback((ticker) => setWatchTickers(p => p.includes(ticker) ? p.filter(x => x !== ticker) : [...p, ticker]), []);
  const isWatchedInv = useCallback((id) => watchInvestors.includes(id), [watchInvestors]);
  const isWatchedTkr = useCallback((ticker) => watchTickers.includes(ticker), [watchTickers]);

  return { watchInvestors, watchTickers, toggleInvestor, toggleTicker, isWatchedInv, isWatchedTkr };
};
