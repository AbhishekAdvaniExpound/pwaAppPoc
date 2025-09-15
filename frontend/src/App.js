// App.js
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InquiryListPage from "./pages/InquiryListPage";
import NegotiationPage from "./pages/NegotiationPage";
import InquiryDetailPage from "./pages/InquiryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/inquiries" element={<InquiryListPage />} />
      <Route path="/InquiryDetailPage/:id" element={<InquiryDetailPage />} />
      <Route path="/NegotiationPage" element={<NegotiationPage />} />
    </Routes>
  );
}
