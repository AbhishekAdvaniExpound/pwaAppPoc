/* eslint-disable no-unused-vars */
import {
  Box,
  Flex,
  Heading,
  Text,
  HStack,
  Icon,
  Divider,
  Select,
  Input,
  Button,
  ButtonGroup,
  useColorMode,
  useColorModeValue,
  SimpleGrid,
  Tooltip,
  IconButton,
  Badge,
  Switch,
  VStack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  Spinner,
} from "@chakra-ui/react";
import {
  StarIcon,
  Search2Icon,
  MoonIcon,
  SunIcon,
  WarningIcon,
  TimeIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@chakra-ui/icons";
import { LayoutGrid, List, LogOut } from "lucide-react";
import { Bell, BellOff } from "react-feather";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../api/authApi";
import axios from "axios";

/* ---------------------------
   Helper: normalize incoming shapes
   --------------------------- */
function normalizeInquiry(inq = {}, idx) {
  const source = inq || {};
  const id =
    source["Inquiry No"] ||
    source.inquiryNo ||
    source.InquiryNo ||
    source.id ||
    `Inq-${idx + 1}`;
  const customer =
    source["Customer Name"] ||
    source.customerName ||
    source.customer ||
    "Unknown Customer";
  const broker =
    source["Broker Name"] || source.brokerName || source.broker || "";
  const sales =
    source["Sales Person Name"] ||
    source.salesPersonName ||
    source.sales ||
    "N/A";
  const inquiryType = source["Inquiry Type"] || source.inquiryType || "";
  const createdOn = source["Created On"] || source.createdOn || null;

  let status = "Pending";
  if (typeof inquiryType === "string") {
    const t = inquiryType.toLowerCase();
    if (t.includes("urgent") || t.includes("high")) status = "High Priority";
    else if (t.includes("normal") || t.includes("domestic")) status = "Normal";
    else status = inquiryType || "Pending";
  }

  return {
    original: source,
    id,
    qty: source.QUANTITY || source.Quantity || 0,
    customer,
    shortCustomer:
      customer.length > 40 ? customer.slice(0, 38) + "…" : customer,
    broker,
    sales,
    status,
    createdOn,
    items: Array.isArray(source.items) ? source.items : [],
  };
}

/* ---------------------------
   InquiryCard (UI)
   --------------------------- */
const InquiryCard = ({
  inquiry,
  index,
  cardBg,
  borderColor,
  subText,
  textColor,
  onClick,
}) => {
  let StatusIcon;
  let statusColor;

  if (inquiry.status === "High Priority") {
    StatusIcon = WarningIcon;
    statusColor = "red";
  } else if (inquiry.status === "Pending") {
    StatusIcon = TimeIcon;
    statusColor = "orange";
  } else {
    StatusIcon = CheckCircleIcon;
    statusColor = "green";
  }

  return (
    <Box
      p={5}
      rounded="xl"
      shadow="md"
      borderLeft="6px solid"
      borderColor={`${statusColor}.400`}
      bg={cardBg}
      _hover={{
        shadow: useColorModeValue("xl", "whiteAlpha.200"),
        transform: "translateY(-3px)",
        transition: "0.2s",
      }}
      onClick={() => onClick(inquiry)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(inquiry);
      }}
      role="button"
      tabIndex={0}
    >
      <HStack spacing={2} px={3} py={1} rounded="full" align="center">
        <Icon as={StatusIcon} color={`${statusColor}.500`} />
        <Text fontSize="sm" fontWeight="semibold" color={`${statusColor}.600`}>
          {inquiry.status}
        </Text>
      </HStack>

      <HStack justify="space-between" mb={2}>
        <HStack spacing={3}>
          <Icon
            as={StarIcon}
            boxSize={5}
            color={index % 2 === 0 ? "#1E3C7B" : "#7B1E1E"}
          />
          <Tooltip label={inquiry.customer} hasArrow>
            <Text
              fontWeight="bold"
              fontSize="md"
              color={textColor}
              noOfLines={1}
            >
              {inquiry.id} ({inquiry.qty}) – {inquiry.customer}
            </Text>
          </Tooltip>
        </HStack>
      </HStack>

      {inquiry.broker && (
        <Tooltip label={inquiry.broker} hasArrow>
          <Text fontSize="sm" color={subText} pl={8} noOfLines={1}>
            Broker: {inquiry.broker}
          </Text>
        </Tooltip>
      )}
      <Text fontSize="sm" color={subText} pl={8}>
        Sales: {inquiry.sales}
      </Text>
    </Box>
  );
};

/* ---------------------------
   Main component - no localStorage
   --------------------------- */
export default function InquiryListPage() {
  const { state } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // mock fallback
  const mockInquiries = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `Inq${i + 1}`,
        qty: 10 + i,
        customer: `Mock Customer ${i + 1}`,
        broker: i % 2 === 0 ? `Mock Broker ${i + 1}` : null,
        sales: `Sales Person ${i + 1}`,
        status:
          i % 3 === 0 ? "High Priority" : i % 3 === 1 ? "Pending" : "Normal",
        items: [],
      })),
    []
  );

  const [inquiriesData, setInquiriesData] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const incomingState = state?.inquiry ?? null;

  // Fetch list directly from API
  const fetchListFromApi = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(
        `${API_BASE}/api/inquiryRoutes/getInquiries`,
        {
          timeout: 8000,
        }
      );
      const list = res?.data?.data ?? res?.data ?? [];
      setInquiriesData(
        Array.isArray(list) && list.length > 0 ? list : mockInquiries
      );
    } catch (err) {
      console.error("API fetch failed:", err?.message ?? err);
      setInquiriesData(mockInquiries);
    } finally {
      setLoadingList(false);
    }
  }, [mockInquiries]);

  // load on mount
  useEffect(() => {
    if (Array.isArray(incomingState) && incomingState.length > 0) {
      setInquiriesData(incomingState);
      return;
    }
    fetchListFromApi();
  }, [incomingState, fetchListFromApi]);

  const inquiries = useMemo(() => {
    if (Array.isArray(incomingState)) return incomingState;
    if (Array.isArray(inquiriesData)) return inquiriesData;
    return [];
  }, [incomingState, inquiriesData]);

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 6;
  const filteredInquiries = useMemo(() => {
    const q = search.toLowerCase();
    return (inquiries || []).filter((inq) => {
      const matchesFilter =
        filter === "All" ? true : (inq.status || "").toString() === filter;
      const matchesSearch =
        (inq.customer || "").toLowerCase().includes(q) ||
        (String(inq.id || "") || "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, inquiries]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredInquiries.length || 0) / pageSize)
  );
  const startIndex = (page - 1) * pageSize;
  const paginatedInquiries = filteredInquiries.slice(
    startIndex,
    startIndex + pageSize
  );

  const handleSelectInquiry = useCallback(
    (inquiry) => {
      navigate(`/InquiryDetailPage/${encodeURIComponent(inquiry.id)}`, {
        state: { inquiry },
      });
    },
    [navigate]
  );

  const { colorMode, toggleColorMode } = useColorMode();
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textHeadingColor = useColorModeValue("black", "white");
  const subText = useColorModeValue("gray.600", "gray.400");

  /* -------------------------
     Render (simplified)
  ------------------------- */
  return (
    <Flex minH="100vh" bg={pageBg} direction="column">
      <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
        <Heading size="md" color={textHeadingColor}>
          Pending Inquiries
        </Heading>
      </Box>

      <Box flex="1" p={8}>
        {loadingList ? (
          <Flex align="center" justify="center" h="50vh">
            <Spinner size="lg" />
            <Text ml={3}>Loading inquiries…</Text>
          </Flex>
        ) : paginatedInquiries.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {paginatedInquiries.map((inq, index) => {
              const inquiry = normalizeInquiry(inq, index);
              return (
                <InquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  index={index}
                  cardBg={cardBg}
                  borderColor={borderColor}
                  subText={subText}
                  textColor={textColor}
                  onClick={handleSelectInquiry}
                />
              );
            })}
          </SimpleGrid>
        ) : (
          <Flex align="center" justify="center" h="60vh" direction="column">
            <Text>No Results Found</Text>
            <Button mt={4} onClick={() => fetchListFromApi()}>
              Retry
            </Button>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
