// InquiryProvider.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";

// adjust this to your environment
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

  // caches and inflight trackers
  const cacheRef = useRef(new Map()); // simple in-memory cache: key -> data
  const inFlightRef = useRef(new Map()); // map<cacheKey, Promise>
  const cooldownRef = useRef(new Map()); // map<cacheKey, timestampUntilWhichWeBackoff>
  const mountedRef = useRef(true);
  const didInitialFetch = useRef(false); // avoids StrictMode double-fetch

  useEffect(() => {
    mountedRef.current = true;
    console.debug("[InquiryProvider] mounted");
    return () => {
      mountedRef.current = false;
      console.debug("[InquiryProvider] unmounted");
    };
  }, []);

  // ---------- Mock data fallback (unchanged, kept as-is) ----------
  const inquiriesData = Array.from({ length: 42 }, (_, i) => ({
    id: `Inq-${i + 1}`,
    qty: 10 + i,
    customer: `Customer Name with longer text that may overflow (${i + 1})`,
    broker: i % 2 === 0 ? `Broker Name with longer text too (${i + 1})` : null,
    sales: `Sales Person (${i + 1})`,
    status: i % 3 === 0 ? "High Priority" : i % 3 === 1 ? "Pending" : "Normal",
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
  }));

  const getMockInquiryById = useCallback(
    (id) => {
      if (!id) return inquiriesData[0];
      const match = String(id).match(/Inq-(\d+)/);
      if (match) {
        const idx = Number(match[1]) - 1;
        if (inquiriesData[idx]) return inquiriesData[idx];
      }
      const numericMatch = String(id).match(/(\d+)$/);
      if (numericMatch) {
        const idx = (Number(numericMatch[1]) - 1) % inquiriesData.length;
        return { ...inquiriesData[idx], id };
      }
      return { ...inquiriesData[0], id };
    },
    [inquiriesData]
  );

  const isServerErrorOrNotFound = (err) => {
    const status = err?.response?.status;
    return status === 500 || status === 503 || status === 404;
  };

  // ---------- Cache key builder (deterministic) ----------
  const cacheKeyFor = (opts = {}) => {
    if (opts && opts.id) return `INQ_${String(opts.id)}`;
    if (opts && opts.query && typeof opts.query === "object") {
      const keys = Object.keys(opts.query).sort();
      const sorted = keys.reduce((acc, k) => {
        acc[k] = opts.query[k];
        return acc;
      }, {});
      return `LIST_${JSON.stringify(sorted)}`;
    }
    return "LIST_ALL";
  };

  // ---------- Generic fetch wrapper with dedupe & cooldown ----------
  const fetchWithDedup = useCallback(async (url, opts = {}) => {
    const cacheKey = cacheKeyFor(opts);

    // If we are currently in a cooldown window for this key, immediately return fallback (or cached) to avoid hammering
    const cooldownUntil = cooldownRef.current.get(cacheKey) || 0;
    const now = Date.now();
    if (cooldownUntil > now) {
      console.warn(`[fetchWithDedup] cooldown active for ${cacheKey} until ${new Date(cooldownUntil).toISOString()}`);
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey);
      }
      // fallback: for list return mock data, for id return a mock item
      return opts.id ? getMockInquiryById(opts.id) : inquiriesData;
    }

    // Return cached value immediately if present
    if (cacheRef.current.has(cacheKey)) {
      // console.debug(`[fetchWithDedup] returning cached for ${cacheKey}`);
      return cacheRef.current.get(cacheKey);
    }

    // If request already in flight for same key, return same promise
    if (inFlightRef.current.has(cacheKey)) {
      // console.debug(`[fetchWithDedup] reusing in-flight for ${cacheKey}`);
      return inFlightRef.current.get(cacheKey);
    }

    // Reserve a placeholder quick to avoid micro-race from near-simultaneous invocations
    inFlightRef.current.set(cacheKey, new Promise(() => {}));

    const controller = new AbortController();
    const promise = (async () => {
      try {
        // console.debug(`[fetchWithDedup] START ${cacheKey} -> ${url}`);
        const res = await api.get(url, {
          params: opts.query,
          signal: controller.signal,
        });
        const data = res?.data?.data ?? res?.data ?? null;
        // store in cache
        cacheRef.current.set(cacheKey, data);
        // console.debug(`[fetchWithDedup] OK ${cacheKey}`);
        return data;
      } catch (err) {
        // If server returns 5xx/503/404 we'll set a short cooldown so we don't hammer the server
        if (isServerErrorOrNotFound(err)) {
          const backoffMs = 5000; // 5s cooldown for failing endpoint (adjust as needed)
          cooldownRef.current.set(cacheKey, Date.now() + backoffMs);
          console.warn(`[fetchWithDedup] server error for ${cacheKey}, cooldown set for ${backoffMs}ms`);
        }
        // bubble up the error to caller so they can handle fallback
        throw err;
      } finally {
        // remove in-flight entry
        inFlightRef.current.delete(cacheKey);
      }
    })();

    // attach controller so caller can abort if they want
    promise.controller = controller;

    // replace placeholder with the actual promise
    inFlightRef.current.set(cacheKey, promise);
    return promise;
  }, [getMockInquiryById, inquiriesData]);

  // ---------- Fetch list (optionally accept filters) ----------
  const fetchInquiries = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError(null);

      try {
        const url = opts.id
          ? `/api/inquiryRoutes/getInquiries/${opts.id}`
          : `/api/inquiryRoutes/getInquiries`;

        // call the dedup wrapper
        const data = await fetchWithDedup(url, opts);

        // if server returned nothing (null/empty), treat as missing and use mock fallback
        const useFallback =
          data == null || (Array.isArray(data) && data.length === 0);

        if (!mountedRef.current) return data;

        if (opts.id) {
          setCurrentInquiry(useFallback ? getMockInquiryById(opts.id) : data);
        } else {
          setInquiries(Array.isArray(data) && !useFallback ? data : inquiriesData);
        }

        return useFallback
          ? opts.id
            ? getMockInquiryById(opts.id)
            : inquiriesData
          : data;
      } catch (err) {
        if (!mountedRef.current) return null;

        // ignore abort errors
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          return null;
        }

        // if server returned 5xx / 404 use mock fallback instead of surfacing error
        if (isServerErrorOrNotFound(err)) {
          if (opts.id) {
            const mock = getMockInquiryById(opts.id);
            setCurrentInquiry(mock);
            if (mountedRef.current) setLoading(false);
            return mock;
          } else {
            setInquiries(inquiriesData);
            if (mountedRef.current) setLoading(false);
            return inquiriesData;
          }
        }

        console.error("Fetch Inquiries Error:", err?.response?.data ?? err.message);
        setError({
          message: err.message,
          status: err?.response?.status,
          body: err?.response?.data,
        });
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchWithDedup, getMockInquiryById, inquiriesData]
  );

  // ---------- Fetch a single inquiry by id (convenience wrapper) ----------
  const fetchInquiryById = useCallback(
    async (id) => {
      if (!id) return null;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWithDedup(`/api/inquiryRoutes/getInquiries/${id}`, { id });

        if (!mountedRef.current) return data;
        if (data == null) {
          const mock = getMockInquiryById(id);
          setCurrentInquiry(mock);
          return mock;
        }

        setCurrentInquiry(data);
        return data;
      } catch (err) {
        if (!mountedRef.current) return null;
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          return null;
        }

        if (isServerErrorOrNotFound(err)) {
          const mock = getMockInquiryById(id);
          setCurrentInquiry(mock);
          return mock;
        }

        console.error("Fetch Inquiry Error:", err?.response?.data ?? err.message);
        setError({
          message: err.message,
          status: err?.response?.status,
          body: err?.response?.data,
        });
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchWithDedup, getMockInquiryById]
  );

  // Auto-fetch list once on mount (guarded to avoid Strict Mode double-fetch)
  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    fetchInquiries().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        fetchInquiries,
        fetchInquiryById,
        setCurrentInquiry,
        clearCache,
        // exposing cache/inflight/cooldown for debugging (optional)
        _cache: cacheRef.current,
        _inFlight: inFlightRef.current,
        _cooldowns: cooldownRef.current,
      }}
    >
      {children}
    </InquiryContext.Provider>
  );
};
