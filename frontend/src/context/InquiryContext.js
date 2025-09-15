import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { API_BASE } from "../api/authApi"; // keep this

// Create axios instance for shared config (timeout, baseURL, interceptors)
const api = axios.create({
  baseURL: API_BASE || "", // e.g. 'http://localhost:5000'
  // headers: { Authorization: `Bearer ${token}` } // add if needed
});

const InquiryContext = createContext();

export const useInquiries = () => useContext(InquiryContext);

export const InquiryProvider = ({ children }) => {
  const [inquiries, setInquiries] = useState([]); // list
  const [currentInquiry, setCurrentInquiry] = useState(null); // selected detail
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list (optionally accept filters)
  const fetchInquiries = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);

    // allow passing query params or path param (opts.id)
    try {
      let res;
      if (opts.id) {
        // if you want to fetch single when id provided
        res = await api.get(`/api/inquiryRoutes/getInquiries/${opts.id}`, {
          params: opts.query,
        });
        // if backend returns { success, total, data }
        const data = res.data && (res.data.data || res.data);
        setCurrentInquiry(data);
        return data;
      } else {
        res = await api.get("/api/inquiryRoutes/getInquiries", {
          params: opts.query,
        });
        const data = res.data && (res.data.data || res.data);
        setInquiries(Array.isArray(data) ? data : []);
        return data;
      }
    } catch (err) {
      console.error(
        "Fetch Inquiries Error:",
        err?.response?.data || err.message
      );
      setError({
        message: err.message,
        status: err?.response?.status,
        body: err?.response?.data,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single inquiry by id (separate convenience wrapper)
  const fetchInquiryById = useCallback(async (id) => {
    console.log({ fetchInquiryById: id });
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/inquiryRoutes/getInquiries/${id}`);
      const data = res.data && (res.data.data || res.data);
      setCurrentInquiry(data);
      return data;
    } catch (err) {
      console.error("Fetch Inquiry Error:", err?.response?.data || err.message);
      setError({
        message: err.message,
        status: err?.response?.status,
        body: err?.response?.data,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch list once on mount
  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

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
      }}
    >
      {children}
    </InquiryContext.Provider>
  );
};
