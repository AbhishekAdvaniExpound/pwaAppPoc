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
    // (not strictly necessary here but helpful if you extend cancellation)
    promise.controller = controller;

    inFlightRef.current.set(cacheKey, promise);
    return promise;
  }, []);

  // Fetch list (optionally accept filters)
  const fetchInquiries = useCallback(
    async (opts = {}) => {
      const key = cacheKeyFor(opts);
      setLoading(true);
      setError(null);

      try {
        const url = opts.id
          ? `/api/inquiryRoutes/getInquiries/${opts.id}`
          : `/api/inquiryRoutes/getInquiries`;

        const data = await fetchWithDedup(url, opts);

        // update state only when mounted
        if (!mountedRef.current) return data;

        if (opts.id) {
          setCurrentInquiry(data);
        } else {
          setInquiries(Array.isArray(data) ? data : []);
        }

        return data;
      } catch (err) {
        if (!mountedRef.current) return null;
        // ignore abort errors if you like:
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          // request was cancelled
          return null;
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
    [fetchWithDedup]
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
    [fetchWithDedup]
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
