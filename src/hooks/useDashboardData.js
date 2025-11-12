import { useState, useEffect, useCallback } from 'react';
import dashboardData from '@/data/dashboard.json';

const resolveDashboardData = () => Promise.resolve({
  ...dashboardData,
  lastUpdated: dashboardData.lastUpdated || new Date().toISOString(),
});

export const useDashboardData = (autoRefresh = true, refreshInterval = 300000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = await resolveDashboardData();
      setData(payload);
      setLastUpdated(new Date(payload.lastUpdated));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated,
  };
};

const resolveFromDataset = (selector) =>
  Promise.resolve(selector(dashboardData));

export const useInventoryMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resolveFromDataset((dataSet) => dataSet.metrics);
      setMetrics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory metrics';
      setError(message);
      console.error('Inventory metrics load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
};

export const useCategoryStockData = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resolveFromDataset((dataSet) => dataSet.categoryData || []);
      setCategoryData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load category data';
      setError(message);
      console.error('Category data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  return { categoryData, loading, error, refetch: fetchCategoryData };
};

export const useSalesData = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resolveFromDataset((dataSet) => dataSet.salesData || []);
      setSalesData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sales data';
      setError(message);
      console.error('Sales data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  return { salesData, loading, error, refetch: fetchSalesData };
};

export const useMovingItems = () => {
  const [fastMovingItems, setFastMovingItems] = useState([]);
  const [slowMovingItems, setSlowMovingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovingItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fastData, slowData] = await Promise.all([
        resolveFromDataset((dataSet) => dataSet.fastMovingItems || []),
        resolveFromDataset((dataSet) => dataSet.slowMovingItems || []),
      ]);
      setFastMovingItems(fastData);
      setSlowMovingItems(slowData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load moving items data';
      setError(message);
      console.error('Moving items load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovingItems();
  }, [fetchMovingItems]);

  return {
    fastMovingItems,
    slowMovingItems,
    loading,
    error,
    refetch: fetchMovingItems,
  };
};
