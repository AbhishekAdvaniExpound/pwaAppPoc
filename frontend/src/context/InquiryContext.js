// InquiryContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import axios from "axios";
import { API_BASE } from "../api/authApi";

const api = axios.create({
  baseURL: API_BASE || "",
});

const InquiryContext = createContext();

export const useInquiries = () => useContext(InquiryContext);

export const InquiryProvider = ({ children }) => {
  const [inquiries, setInquiries] = useState([]); // list
  const [currentInquiry, setCurrentInquiry] = useState(null); // selected detail
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // whether UI is currently showing mock data instead of API
  const [usingMock, setUsingMock] = useState(false);

  // caches and inflight trackers
  const cacheRef = useRef(new Map()); // simple in-memory cache
  const inFlightRef = useRef(new Map()); // map<cacheKey, Promise>
  const mountedRef = useRef(true);
  const didInitialFetch = useRef(false); // avoids StrictMode double-fetch

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // optionally cancel any in-flight requests by storing controllers per key (not implemented here)
    };
  }, []);

  // helper to build cache keys
  const cacheKeyFor = (opts = {}) => {
    if (opts.id) return `INQ_${String(opts.id)}`;
    if (opts.query) return `LIST_${JSON.stringify(opts.query)}`;
    return "LIST_ALL";
  };

  // --- mock data fallback (used when user opts to show mocks) ---
  const mockInquiries = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: `Inq${i + 1}`,
        qty: 10 + i,
        customer: `Customer Name with longer text that may overflow (${i + 1})`,
        broker:
          i % 2 === 0 ? `Broker Name with longer text too (${i + 1})` : null,
        sales: `Sales Person (${i + 1})`,
        status:
          i % 3 === 0 ? "High Priority" : i % 3 === 1 ? "Pending" : "Normal",
        items: [
          {
            id: 1,
            name: `Item A${i + 1}`,
            qty: 20 + i,
            rate: 100 + i,
            grade: (i % 5) + 1,
            winding: 10 + (i % 3) * 5,
            pq: i % 2 === 0 ? "Yes" : "No",
            clq: i % 2 === 1 ? "Yes" : "No",
            lastRate: 95 + i,
          },
          {
            id: 2,
            name: `Item B${i + 1}`,
            qty: 15 + i,
            rate: 120 + i,
            grade: (i % 5) + 1,
            winding: 15 + (i % 3) * 5,
            pq: i % 2 === 0 ? "Yes" : "No",
            clq: i % 2 === 1 ? "Yes" : "No",
            lastRate: 110 + i,
          },
        ],
      })),
    []
  );

  // Generic fetch wrapper with dedupe & cache. Supports opts.force to bypass cache/inFlight.
  const fetchWithDedup = useCallback(async (url, opts = {}) => {
    const cacheKey = cacheKeyFor(opts);

    // force clears cache and inFlight for this key
    if (opts.force) {
      cacheRef.current.delete(cacheKey);
      inFlightRef.current.delete(cacheKey);
    }

    // return cached value immediately if present
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }

    // if request already in flight for same key, return same promise
    if (inFlightRef.current.has(cacheKey)) {
      return inFlightRef.current.get(cacheKey);
    }

    const controller = new AbortController();
    const promise = (async () => {
      try {
        const res = await api.get(url, {
          params: opts.query,
          signal: controller.signal,
        });
        const data = res?.data?.data ?? res?.data ?? null;
        // store in cache
        cacheRef.current.set(cacheKey, data);
        return data;
      } catch (err) {
        throw err;
      } finally {
        // remove in-flight entry
        inFlightRef.current.delete(cacheKey);
      }
    })();

    // attach controller to promise (helpful if you later want to cancel)
    promise.controller = controller;

    inFlightRef.current.set(cacheKey, promise);
    return promise;
  }, []);

  // Fetch list (optionally accept filters)
  const fetchInquiries = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError(null);

      try {
        const url = opts.id
          ? `/api/inquiryRoutes/getInquiries/${opts.id}`
          : `/api/inquiryRoutes/getInquiries`;

        const data = await fetchWithDedup(url, opts);

        if (!mountedRef.current) return data;

        if (opts.id) {
          setCurrentInquiry(data);
        } else {
          // if API returns array, use it; if null/empty, keep existing list (don't auto-use mocks)
          if (Array.isArray(data) && data.length > 0) {
            setInquiries(data);
            setUsingMock(false);
          } else {
            // no data returned — do not auto fallback; indicate empty and let UI decide
            setInquiries([]);
          }
        }

        return data;
      } catch (err) {
        if (!mountedRef.current) return null;

        if (err?.name === "CanceledError" || err?.message === "canceled") {
          return null;
        }

        console.error(
          "Fetch Inquiries Error:",
          err?.response?.data ?? err.message
        );

        // set error but DO NOT automatically switch to mock — consumer will prompt user
        setError({
          message: err.message,
          status: err?.response?.status,
          body: err?.response?.data,
          url: opts.id
            ? `/api/inquiryRoutes/getInquiries/${opts.id}`
            : `/api/inquiryRoutes/getInquiries`,
        });

        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchWithDedup]
  );

  // Fetch a single inquiry by id (convenience wrapper)
  const fetchInquiryById = useCallback(
    async (id, opts = {}) => {
      if (!id) return null;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWithDedup(
          `/api/inquiryRoutes/getInquiries/${id}`,
          { id, ...opts }
        );
        if (!mountedRef.current) return data;
        setCurrentInquiry(data);
        return data;
      } catch (err) {
        if (!mountedRef.current) return null;

        if (err?.name === "CanceledError" || err?.message === "canceled") {
          return null;
        }

        console.error(
          "Fetch Inquiry Error:",
          err?.response?.data ?? err.message
        );

        // don't auto fallback; expose error and allow consumer to choose mock
        setError({
          message: err.message,
          status: err?.response?.status,
          body: err?.response?.data,
          url: `/api/inquiryRoutes/getInquiries/${id}`,
        });

        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchWithDedup]
  );

  // Apply mock fallback (called when user confirms "show mock entries")
  const applyMockFallback = useCallback(() => {
    setInquiries(mockInquiries);
    setUsingMock(true);
    setError(null);
  }, [mockInquiries]);

  // Try to refresh from API (force bypass cache). Returns true if API returned data.
  const refreshFromApi = useCallback(
    async (opts = {}) => {
      // clear any error first
      setError(null);
      setLoading(true);
      try {
        const url = opts.id
          ? `/api/inquiryRoutes/getInquiries/${opts.id}`
          : `/api/inquiryRoutes/getInquiries`;

        const data = await fetchWithDedup(url, { ...opts, force: true });
        if (!mountedRef.current) return false;

        if (opts.id) {
          if (data) {
            setCurrentInquiry(data);
            setUsingMock(false);
            return true;
          }
          return false;
        } else {
          if (Array.isArray(data) && data.length > 0) {
            setInquiries(data);
            setUsingMock(false);
            return true;
          }
          return false;
        }
      } catch (err) {
        console.error("Refresh from API failed:", err?.message ?? err);
        setError({
          message: err.message,
          status: err?.response?.status,
          body: err?.response?.data,
        });
        return false;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchWithDedup]
  );

  // Auto-fetch list once on mount (guarded to avoid double-fetch in Strict Mode)
  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    // initial try to fetch from API
    fetchInquiries().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fetchInquiries is stable because of useCallback

  // expose a method to clear cache if needed
  const clearCache = useCallback((keyPrefix = "") => {
    if (!keyPrefix) {
      cacheRef.current.clear();
    } else {
      for (const k of Array.from(cacheRef.current.keys())) {
        if (k.startsWith(keyPrefix)) cacheRef.current.delete(k);
      }
    }
  }, []);

  return (
    <InquiryContext.Provider
      value={{
        inquiries,
        currentInquiry,
        loading,
        error,
        usingMock,
        fetchInquiries,
        fetchInquiryById,
        refreshFromApi,
        applyMockFallback,
        setCurrentInquiry,
        clearCache,
        // exposing cache/inflight for debugging (optional)
        _cache: cacheRef.current,
        _inFlight: inFlightRef.current,
      }}
    >
      {children}
    </InquiryContext.Provider>
  );
};
