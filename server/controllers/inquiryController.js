// server/controllers/inquiryController.js

// Mock inquiries array
const inquiries = Array.from({ length: 42 }, (_, i) => ({
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

exports.getInquiries = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      total: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
      error: error.message,
    });
  }
};
