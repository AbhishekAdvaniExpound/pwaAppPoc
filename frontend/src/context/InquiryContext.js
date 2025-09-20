import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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

  // Generic fetch wrapper with dedupe & cache
  const fetchWithDedup = useCallback(async (url, opts = {}) => {
    const cacheKey = cacheKeyFor(opts);

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
        // if aborted, rethrow so caller knows
        throw err;
      } finally {
        // remove in-flight entry
        inFlightRef.current.delete(cacheKey);
      }
    })();

    // store controller in the Promise so it can be cancelled if needed later
    promise.controller = controller;

    inFlightRef.current.set(cacheKey, promise);
    return promise;
  }, []);

  // --- mock data fallback (used when server returns 500/404 or response is empty) ---
  const inquiriesData = Array.from({ length: 42 }, (_, i) => ({
    id: `Inq-${i + 1}`,
    qty: 10 + i, // just to vary a bit
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
      // If id follows our mock pattern "Inq-N", return the matching mock
      const match = String(id).match(/Inq-(\d+)/);
      if (match) {
        const idx = Number(match[1]) - 1;
        if (inquiriesData[idx]) return inquiriesData[idx];
      }
      // If id looks numeric but not Inq-N, try to pick an index from the tail
      const numericMatch = String(id).match(/(\d+)$/);
      if (numericMatch) {
        const idx = (Number(numericMatch[1]) - 1) % inquiriesData.length;
        return { ...inquiriesData[idx], id };
      }
      // Fallback: return first mock but set the requested id
      return { ...inquiriesData[0], id };
    },
    [inquiriesData]
  );

  const isServerErrorOrNotFound = (err) => {
    const status = err?.response?.status;
    return status === 500 || status === 404;
  };

  // Fetch list (optionally accept filters)
  const fetchInquiries = useCallback(
    async (opts = {}) => {
      // const key = cacheKeyFor(opts);
      setLoading(true);
      setError(null);

      try {
        const url = opts.id
          ? `/api/inquiryRoutes/getInquiries/${opts.id}`
          : `/api/inquiryRoutes/getInquiries`;

        const data = await fetchWithDedup(url, opts);

        // if server returned nothing (null/empty), treat as missing and use mock fallback
        const useFallback =
          data == null || (Array.isArray(data) && data.length === 0);

        // update state only when mounted
        if (!mountedRef.current) return data;

        if (opts.id) {
          setCurrentInquiry(useFallback ? getMockInquiryById(opts.id) : data);
        } else {
          setInquiries(
            Array.isArray(data) && !useFallback ? data : inquiriesData
          );
        }

        return useFallback
          ? opts.id
            ? getMockInquiryById(opts.id)
            : inquiriesData
          : data;
      } catch (err) {
        if (!mountedRef.current) return null;
        // ignore abort errors if you like:
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          // request was cancelled
          return null;
        }

        // If the server returned 500 or 404, use mock fallback instead of surfacing error
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

        console.error(
          "Fetch Inquiries Error:",
          err?.response?.data ?? err.message
        );
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
    [fetchWithDedup, inquiriesData, getMockInquiryById]
  );

  // Fetch a single inquiry by id (convenience wrapper)
  const fetchInquiryById = useCallback(
    async (id) => {
      if (!id) return null;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWithDedup(
          `/api/inquiryRoutes/getInquiries/${id}`,
          { id }
        );

        // If API returned falsy, use mock
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

        console.error(
          "Fetch Inquiry Error:",
          err?.response?.data ?? err.message
        );
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

  // Auto-fetch list once on mount (guarded to avoid double-fetch in Strict Mode)
  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    // you can pass a default query here if needed
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
        fetchInquiries,
        fetchInquiryById,
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
