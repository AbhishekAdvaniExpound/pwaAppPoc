// InquiryProvider.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const InquiryContext = createContext();

export const useInquiries = () => useContext(InquiryContext);

export const InquiryProvider = ({ children }) => {
  const [inquiries, setInquiries] = useState([]);
  const [currentInquiry, setCurrentInquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Mock data ---
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

  // --- Always resolve with mock data ---
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInquiries(inquiriesData);
      return inquiriesData;
    } catch (err) {
      setError({ message: err.message });
      return [];
    } finally {
      setLoading(false);
    }
  }, [inquiriesData]);

  const fetchInquiryById = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const mock = getMockInquiryById(id);
        setCurrentInquiry(mock);
        return mock;
      } catch (err) {
        setError({ message: err.message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getMockInquiryById]
  );

  // auto-load mock list
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
