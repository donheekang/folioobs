import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase에서 투자자 목록 가져오기
 */
export function useInvestors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('is_active', true)
        .order('id');

      if (error) setError(error.message);
      else setData(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { investors: data, loading, error };
}

/**
 * 특정 투자자의 최신 분기 보유종목 가져오기
 */
export function useHoldings(investorId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!investorId) { setLoading(false); return; }

    async function fetch() {
      setLoading(true);

      // 최신 분기 찾기
      const { data: latestFiling } = await supabase
        .from('filings')
        .select('quarter')
        .eq('investor_id', investorId)
        .order('report_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestFiling) { setLoading(false); return; }

      // 보유종목 + 종목정보 조인
      const { data, error } = await supabase
        .from('holdings')
        .select(`
          *,
          securities (ticker, name, name_ko, sector, sector_ko)
        `)
        .eq('investor_id', investorId)
        .eq('quarter', latestFiling.quarter)
        .order('value', { ascending: false });

      if (error) setError(error.message);
      else setData(data || []);
      setLoading(false);
    }
    fetch();
  }, [investorId]);

  return { holdings: data, loading, error };
}

/**
 * 모든 투자자의 최신 보유종목 (대시보드용)
 */
export function useAllHoldings() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      // v_latest_holdings 뷰 사용 (schema.sql에 정의됨)
      const { data: rows, error } = await supabase
        .from('v_latest_holdings')
        .select('*')
        .order('value', { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // 투자자별로 그룹핑
      const grouped = {};
      (rows || []).forEach(row => {
        const iid = row.investor_id;
        if (!grouped[iid]) grouped[iid] = [];
        grouped[iid].push({
          ticker: row.ticker,
          name: row.security_name_ko || row.security_name,
          shares: row.shares,
          // ⚠️ 주의: DB에 실제 달러로 저장된 경우 ÷1B, 천달러 단위면 ÷1M 필요
          // 현재 이 hook은 미사용 — useDataProvider.jsx에서 올바른 단위 변환 수행 중
          value: row.value / 1000,
          pct: row.pct_of_portfolio,
          sector: row.sector_ko || row.sector,
          change: 0, // holding_changes에서 별도 조회 필요
        });
      });

      setData(grouped);
      setLoading(false);
    }
    fetch();
  }, []);

  return { holdings: data, loading, error };
}

/**
 * 분기별 변동 내역 가져오기
 */
export function useHoldingChanges(quarter) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      let query = supabase
        .from('holding_changes')
        .select(`
          *,
          investors (name_ko, avatar, gradient, color),
          securities (ticker, name_ko, sector_ko)
        `)
        .neq('change_type', 'hold')
        .order('value_current', { ascending: false });

      if (quarter) {
        query = query.eq('quarter', quarter);
      } else {
        // 최신 분기
        const { data: latest } = await supabase
          .from('filings')
          .select('quarter')
          .order('report_date', { ascending: false })
          .limit(1)
          .single();
        if (latest) query = query.eq('quarter', latest.quarter);
      }

      const { data, error } = await query;
      if (error) setError(error.message);
      else setData(data || []);
      setLoading(false);
    }
    fetch();
  }, [quarter]);

  return { changes: data, loading, error };
}

/**
 * 투자자 오버랩 (공통 보유 종목)
 */
export function useOverlapStocks() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_overlap_stocks')
        .select('*')
        .order('holder_count', { ascending: false });

      if (error) setError(error.message);
      else setData(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { overlaps: data, loading, error };
}

/**
 * 범용 Supabase 쿼리 훅
 */
export function useSupabaseQuery(tableName, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(tableName).select(options.select || '*');

    if (options.eq) {
      Object.entries(options.eq).forEach(([k, v]) => { query = query.eq(k, v); });
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) setError(error.message);
    else setData(data || []);
    setLoading(false);
  }, [tableName, JSON.stringify(options)]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
