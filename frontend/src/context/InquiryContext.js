import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../api/authApi";

// Create Context
const InquiryContext = createContext();

// Hook for easy usage
export const useInquiries = () => useContext(InquiryContext);

export const InquiryProvider = ({ children }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Fetch inquiries from backend
  const fetchInquiries = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${API_BASE}/api/inquiryRoutes/getInquiries`
      );

      console.log({ response: response.data.data });

      setInquiries(response.data.data || []); // because your controller sends { success, total, data }
    } catch (err) {
      console.error("Fetch Inquiries Error:", err.message);
      setError("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when context mounts
  useEffect(() => {
    fetchInquiries();
  }, []);

  return (
    <InquiryContext.Provider
      value={{ inquiries, loading, error, fetchInquiries }}
    >
      {children}
    </InquiryContext.Provider>
  );
};
