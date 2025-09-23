/* eslint-disable no-unused-vars */
// InquiryListPage.js (patched: fetch + cache fallback so list persists when returning)
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
      <HStack
        spacing={2}
        px={3}
        py={1}
        rounded="full"
        align="center"
        justify="center"
      >
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
   Utility: decode VAPID helper (kept from your file)
   --------------------------- */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

/* ---------------------------
   Main component - patched version
   --------------------------- */
export default function InquiryListPage({ inquiryparams }) {
  const { state } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // --- mock data fallback (used when server returns 500/404 or response is empty) ---
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

  // -------------------------
  // New: local cached/fetched list state + keys
  // -------------------------
  const [inquiriesData, setInquiriesData] = useState(null); // array or null
  const [loadingList, setLoadingList] = useState(false);
  const LIST_LS_KEY = "inquiriesList_v1";

  // incoming nav state fallback
  const incomingState = state?.inquiry ?? null;

  // Helper: fetch list from backend and persist to localStorage
  const fetchListFromApi = useCallback(async () => {
    setLoadingList(true);
    try {
      // If API_BASE is undefined on some devices, log that
      if (!API_BASE) {
        console.warn("[fetchListFromApi] API_BASE is not defined");
      }
      const res = await axios.get(
        `${API_BASE}/api/inquiryRoutes/getInquiries`,
        { timeout: 8000 }
      );
      const list = res?.data?.data ?? res?.data ?? [];
      console.debug(
        "[fetchListFromApi] fetched list length:",
        Array.isArray(list) ? list.length : typeof list
      );
      if (Array.isArray(list) && list.length > 0) {
        setInquiriesData(list);
        try {
          localStorage.setItem(LIST_LS_KEY, JSON.stringify(list));
        } catch (e) {
          console.warn("Could not persist inquiries to localStorage", e);
        }
      } else {
        // if backend returned empty array treat as empty but fallback to mock as last resort
        console.warn(
          "[fetchListFromApi] API returned empty or unexpected list, falling back to mock"
        );
        setInquiriesData(mockInquiries);
        try {
          localStorage.setItem(LIST_LS_KEY, JSON.stringify(mockInquiries));
        } catch (e) {}
      }
      return list;
    } catch (err) {
      console.error("Failed to fetch inquiries from API", err?.message ?? err);
      // fallback: use saved localStorage if available, else mock
      try {
        const saved = JSON.parse(localStorage.getItem(LIST_LS_KEY) || "null");
        if (Array.isArray(saved) && saved.length > 0) {
          console.info(
            "[fetchListFromApi] using cached localStorage list after fetch failure"
          );
          setInquiriesData(saved);
          return saved;
        }
      } catch (e) {
        // parse error — ignore
      }

      // final fallback: use mock data so UI is usable across devices
      console.info("[fetchListFromApi] falling back to mock data");
      setInquiriesData(mockInquiries);
      try {
        localStorage.setItem(LIST_LS_KEY, JSON.stringify(mockInquiries));
      } catch (e) {}
      return mockInquiries;
    } finally {
      setLoadingList(false);
    }
  }, [mockInquiries]);

  // On mount: load from location.state -> localStorage -> API
  useEffect(() => {
    let mounted = true;
    (async () => {
      // If navigation passed an entire list array, use and persist it
      if (Array.isArray(incomingState) && incomingState.length > 0) {
        setInquiriesData(incomingState);
        try {
          localStorage.setItem(LIST_LS_KEY, JSON.stringify(incomingState));
        } catch (e) {}
        return;
      }

      // try load from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem(LIST_LS_KEY) || "null");
        if (mounted && Array.isArray(saved) && saved.length > 0) {
          setInquiriesData(saved);
          // also try background refresh but don't block the UI
          fetchListFromApi().catch(() => {});
          return;
        }
      } catch (e) {
        // ignore parse errors and fetch fresh
      }

      // last: fetch from API
      await fetchListFromApi();
    })();

    return () => {
      mounted = false;
    };
  }, [incomingState, fetchListFromApi]);

  /* -------------------------
     original inquiry selection fallback:
     - If location.state contains a single inquiry object we keep it in localStorage
  ------------------------- */
  useEffect(() => {
    if (incomingState && !Array.isArray(incomingState)) {
      try {
        localStorage.setItem("selectedInquiry", JSON.stringify(incomingState));
      } catch (e) {}
    }
  }, [incomingState]);

  /* -------------------------
     Derive the array used by the UI (inquiries)
     Priority:
       1) if location.state holds an array -> use it
       2) else use inquiriesData (cached / fetched)
       3) else fallback to mock array (so some devices always see data)
  ------------------------- */
  const inquiries = useMemo(() => {
    if (Array.isArray(incomingState)) return incomingState;
    if (Array.isArray(inquiriesData)) return inquiriesData;
    return [];
  }, [incomingState, inquiriesData]);

  /* -------------------------
     Standard UI state (mostly unchanged)
  ------------------------- */
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("viewMode") || "grid";
  });
  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  const pageSize = 6;
  const searchTimerRef = useRef(null);
  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }, []);
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSelectInquiry = useCallback(
    (inquiry) => {
      console.debug("handleSelectInquiry ->", inquiry && inquiry.id);
      navigate(`/InquiryDetailPage/${encodeURIComponent(inquiry.id)}`, {
        state: { inquiry },
      });
      try {
        localStorage.setItem("selectedInquiry", JSON.stringify(inquiry));
      } catch (e) {}
    },
    [navigate]
  );

  /* -------------------------
     Filtering + pagination + UI helpers
  ------------------------- */
  const filteredInquiries = useMemo(() => {
    const q = (search || "").toLowerCase();
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

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      (async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));
      })();
    }
  }, []);

  const subscribeUser = async () => {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error("Subscribe failed", err);
    }
  };

  const unsubscribeUser = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe failed", err);
    }
  };

  /* -------------------------
     UI Colors + Drawer state
  ------------------------- */
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textHeadingColor = useColorModeValue("black", "white");
  const subText = useColorModeValue("gray.600", "gray.400");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "PUSH_RECEIVED") {
          const { title, body, ts } = event.data.payload;
          setHistory((prev) => [{ id: ts, title, body }, ...prev]);
        }
      });
    }
  }, []);

  /* -------------------------
     Render
  ------------------------- */
  return (
    <Flex minH="100vh" bg={pageBg} direction="column">
      <Box
        position="sticky"
        top="0"
        zIndex="10"
        bg={pageBg}
        p={4}
        shadow="md"
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <HStack justify="space-between" w="100%">
          <Heading
            size="md"
            bgClip="text"
            fontWeight="bold"
            color={textHeadingColor}
          >
            Welcome
            <br />
            <Text as="span" fontWeight="normal" fontSize="sm">
              Here are your Pending Inquiries
            </Text>
          </Heading>

          <HStack spacing={2}>
            <Box position="relative">
              <Tooltip
                label={
                  isSubscribed
                    ? "View Notifications"
                    : "Subscribe to notifications"
                }
              >
                <IconButton
                  aria-label="Push Notifications"
                  icon={<Icon as={Bell} />}
                  onClick={onOpen}
                  variant="ghost"
                  size="lg"
                  rounded="full"
                />
              </Tooltip>

              {history.length > 0 && (
                <Badge
                  colorScheme="red"
                  rounded="full"
                  position="absolute"
                  top="1"
                  right="1"
                  fontSize="0.7em"
                  px={1.5}
                >
                  {history.length}
                </Badge>
              )}
            </Box>

            <Tooltip
              label={`Switch to ${
                colorMode === "light" ? "dark" : "light"
              } mode`}
            >
              <IconButton
                aria-label="Toggle theme"
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                size="lg"
                rounded="full"
              />
            </Tooltip>
            <Tooltip label="Logout">
              <IconButton
                aria-label="Logout"
                icon={<LogOut />}
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                variant="ghost"
                size="xs"
                rounded="full"
                colorScheme="red"
              />
            </Tooltip>
          </HStack>
        </HStack>

        <HStack mt={4} spacing={4}>
          <Input
            placeholder="Search by ID or Customer"
            onChange={handleSearch}
            bg={cardBg}
            borderColor={borderColor}
            maxW="max-content"
            _focus={{ borderColor: "#1E3C7B" }}
          />
          <Select
            w="max-content"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            bg={cardBg}
            borderColor={borderColor}
            color={textColor}
            _focus={{ borderColor: "#7B1E1E" }}
          >
            <option>All</option>
            <option>High Priority</option>
            <option>Normal</option>
            <option>Pending</option>
          </Select>
          <Button leftIcon={<Search2Icon />} colorScheme="blue" />
        </HStack>
      </Box>

      <Box flex="1" p={8}>
        <HStack justify="flex-end" px={8} mb={4}>
          <ButtonGroup size="sm" isAttached rounded="full" variant="outline">
            <Tooltip label="Grid View">
              <IconButton
                aria-label="Grid View"
                icon={<LayoutGrid size={16} />}
                variant={viewMode === "grid" ? "solid" : "ghost"}
                colorScheme="blue"
                onClick={() => setViewMode("grid")}
                rounded="full"
              />
            </Tooltip>
            <Tooltip label="List View">
              <IconButton
                aria-label="List View"
                icon={<List size={16} />}
                variant={viewMode === "list" ? "solid" : "ghost"}
                colorScheme="blue"
                onClick={() => setViewMode("list")}
                rounded="full"
              />
            </Tooltip>
          </ButtonGroup>
        </HStack>

        {loadingList ? (
          <Flex align="center" justify="center" h="50vh">
            <Spinner size="lg" />
            <Text ml={3}>Loading inquiries…</Text>
          </Flex>
        ) : paginatedInquiries.length > 0 ? (
          viewMode === "grid" ? (
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
            <VStack spacing={2} align="stretch">
              {paginatedInquiries.map((inq, index) => {
                const inquiry = normalizeInquiry(inq, index);
                return (
                  <Flex
                    key={inquiry.id}
                    p={4}
                    rounded="md"
                    shadow="sm"
                    bg={cardBg}
                    border="1px solid"
                    borderColor={borderColor}
                    justify="space-between"
                    align="center"
                    _hover={{ shadow: "md", cursor: "pointer" }}
                    onClick={() => handleSelectInquiry(inquiry)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectInquiry(inquiry);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <HStack spacing={4}>
                      <Icon
                        as={StarIcon}
                        boxSize={4}
                        color={index % 2 === 0 ? "#1E3C7B" : "#7B1E1E"}
                      />
                      <Box>
                        <Text fontWeight="bold" color={textColor}>
                          {inquiry.id} ({inquiry.qty})
                        </Text>
                        <Text fontSize="sm" color={subText} noOfLines={1}>
                          {inquiry.customer}
                        </Text>
                      </Box>
                    </HStack>

                    <Badge
                      colorScheme={
                        inquiry.status === "High Priority"
                          ? "red"
                          : inquiry.status === "Pending"
                          ? "orange"
                          : "green"
                      }
                    >
                      {inquiry.status}
                    </Badge>
                  </Flex>
                );
              })}
            </VStack>
          )
        ) : (
          <Flex
            align="center"
            justify="center"
            h="60vh"
            direction="column"
            color={subText}
          >
            <Text fontSize="lg" mb={2}>
              No Results Found
            </Text>
            <Text fontSize="sm">
              Try adjusting your filters or search query.
            </Text>
            <Button mt={4} onClick={() => fetchListFromApi()}>
              Retry Fetch
            </Button>
          </Flex>
        )}
      </Box>

      {totalPages > 1 && (
        <HStack justify="space-between" px={8} py={4}>
          <Text fontSize="sm" color={subText}>
            Showing {Math.min(filteredInquiries.length, startIndex + 1)} –{" "}
            {Math.min(startIndex + pageSize, filteredInquiries.length)} of{" "}
            {filteredInquiries.length}
          </Text>

          <HStack spacing={1}>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Previous Page"
              icon={<ArrowLeftIcon />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
              )
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <Text px={2} color={subText}>
                      …
                    </Text>
                  )}
                  <Button
                    size="sm"
                    variant={p === page ? "solid" : "ghost"}
                    colorScheme={p === page ? "blue" : "gray"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </React.Fragment>
              ))}
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Next Page"
              icon={<ArrowRightIcon />}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page === totalPages}
            />
          </HStack>
        </HStack>
      )}

      <Divider my={4} borderColor={borderColor} />
      <Text fontSize="xs" textAlign="center" color={subText} pb={4}>
        Inquiry list powered by DNH API
      </Text>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay />
        <DrawerContent bg={pageBg}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
            <HStack justify="space-between" w="100%">
              <HStack spacing={2}>
                <Box position="relative">
                  <Tooltip
                    label={
                      isSubscribed
                        ? "View Notifications"
                        : "Subscribe to notifications"
                    }
                  >
                    <IconButton
                      aria-label="Push Notifications"
                      icon={<Icon as={Bell} />}
                      onClick={onOpen}
                      variant="ghost"
                      size="lg"
                      rounded="full"
                    />
                  </Tooltip>
                  {history.length > 0 && (
                    <Badge
                      colorScheme="red"
                      rounded="full"
                      position="absolute"
                      top="1"
                      right="1"
                      fontSize="0.7em"
                      px={1.5}
                    >
                      {history.length}
                    </Badge>
                  )}
                </Box>
                <Text fontWeight="bold" fontSize="md">
                  Notifications
                </Text>
              </HStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody px={4} py={5}>
            <HStack mb={5} justify="space-between" align="center">
              <HStack spacing={2}>
                <Icon as={Bell} color="blue.500" boxSize={4} />
                <Text fontSize="sm" color={subText} fontWeight="medium">
                  Push Notifications
                </Text>
              </HStack>

              <HStack spacing={2}>
                <Text fontSize="xs" color={subText}>
                  {isSubscribed ? "On" : "Off"}
                </Text>
                <Switch
                  colorScheme="blue"
                  isChecked={isSubscribed}
                  onChange={isSubscribed ? unsubscribeUser : subscribeUser}
                />
              </HStack>
            </HStack>

            {history.length > 0 && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={() => setHistory([])}
              >
                Clear
              </Button>
            )}

            {history.length === 0 ? (
              <Flex
                align="center"
                justify="center"
                h="60%"
                color={subText}
                direction="column"
              >
                <Icon as={BellOff} boxSize={8} mb={2} opacity={0.5} />
                <Text>No notifications yet…</Text>
              </Flex>
            ) : (
              <VStack align="stretch" spacing={4}>
                {history.map((h) => (
                  <Box
                    key={h.id}
                    p={4}
                    rounded="xl"
                    shadow="sm"
                    border="1px solid"
                    borderColor={borderColor}
                    bg={cardBg}
                    _hover={{ shadow: "md", transform: "scale(1.01)" }}
                    transition="all 0.2s"
                  >
                    <Text fontWeight="semibold" mb={1}>
                      {h.title}
                    </Text>
                    <Text fontSize="sm" color={subText} noOfLines={2}>
                      {h.body}
                    </Text>
                    <Text
                      fontSize="xs"
                      mt={2}
                      color="gray.500"
                      textAlign="right"
                      fontStyle="italic"
                    >
                      {new Date(h.id).toLocaleString()}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
