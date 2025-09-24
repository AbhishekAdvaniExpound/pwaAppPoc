/* eslint-disable no-unused-vars */
// InquiryListPage.js (patched: removed localStorage usage; now uses InquiryContext for list/detail fetch + mock control)
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
  Grid,
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
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
  RepeatIcon,
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
import { useInquiries } from "../context/InquiryContext";

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
  } else if (source.status) {
    status = source.status;
  }

  return {
    original: source,
    id,
    qty: source.QUANTITY || source.Quantity || source.qty || 0,
    customer,
    shortCustomer:
      customer?.length > 40 ? customer.slice(0, 38) + "…" : customer,
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
  const padding = "=".repeat((4 - (base64String?.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

/* ---------------------------
   Main component - now integrated with InquiryContext
   --------------------------- */
export default function InquiryListPage({ inquiryparams }) {
  const { state } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Context-driven data & helpers
  const {
    inquiries: ctxInquiries,
    loading: ctxLoading,
    error: ctxError,
    usingMock,
    fetchInquiries,
    fetchInquiryById,
    refreshFromApi,
    applyMockFallback,
  } = useInquiries();

  // incoming nav state fallback (single inquiry or array)
  const incomingState = state?.inquiry ?? null;

  // Local UI state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  const pageSize = 6;
  const searchTimerRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [history, setHistory] = useState([]);

  // UI Colors
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textHeadingColor = useColorModeValue("black", "white");
  const subText = useColorModeValue("gray.600", "gray.400");

  // Derived inquiries array priority:
  // 1) incomingState array, 2) context inquiries, 3) empty []
  const inquiries = useMemo(() => {
    if (Array.isArray(incomingState)) return incomingState;
    if (Array.isArray(ctxInquiries)) return ctxInquiries;
    return [];
  }, [incomingState, ctxInquiries]);

  // Loading state: prefer context loading
  const loadingList = ctxLoading;

  // Initial fetch on mount if context has no data and no incoming state
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Array.isArray(incomingState) && incomingState?.length > 0) return;
      // trigger context fetch (context handles dedupe & caching)
      await fetchInquiries().catch(() => {});
    })();
    return () => {
      mounted = false;
    };
  }, [incomingState, fetchInquiries]);

  // Search handler with debounce
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

  // Select inquiry -> navigate to detail (pass object in state when available)
  const handleSelectInquiry = useCallback(
    (inquiry) => {
      navigate(`/InquiryDetailPage/${encodeURIComponent(inquiry.id)}`, {
        state: { inquiry },
      });
    },
    [navigate]
  );

  // Filtering + pagination
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
    Math.ceil((filteredInquiries?.length || 0) / pageSize)
  );
  const startIndex = (page - 1) * pageSize;
  const paginatedInquiries = filteredInquiries.slice(
    startIndex,
    startIndex + pageSize
  );

  // Push subscription status (unchanged)
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
      // server call intentionally uses fetch to keep previous behaviour
      await fetch(`/api/push/subscribe`, {
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

  // Notifications from service worker (unchanged)
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

  // Refresh entire list from API (bypass cache). Shows toast on success/failure.
  const handleRefreshList = async () => {
    const previousUsingMock = Boolean(usingMock);
    const ok = await refreshFromApi().catch(() => false);
    if (ok) {
      if (previousUsingMock && !usingMock) {
        toast({
          title: "Switched from mock to API data",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Refreshed from API",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } else {
      toast({
        title: "API refresh failed",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  /* -------------------------
     Render
  ------------------------- */
  return (
    <Flex minH="100vh" bg={pageBg} direction="column">
      {/* Improved header */}
      <Box
        position="sticky"
        top="0"
        zIndex="sticky"
        bg={pageBg}
        p={{ base: 3, md: 4 }}
        boxShadow="sm"
        borderBottom="1px solid"
        borderColor={borderColor}
        style={{ backdropFilter: "saturate(120%) blur(6px)" }}
      >
        <VStack spacing={3} align="stretch" w="100%">
          {/* Row 1: Title + actions */}
          <HStack justify="space-between" w="100%" align="center">
            <Box>
              <Heading
                size={{ base: "sm", md: "md" }}
                fontWeight="700"
                color={textHeadingColor}
                lineHeight="1.05"
              >
                Pending Inquiries
              </Heading>
              <Text fontSize="xs" color={subText} mt={1}>
                Your active inquiries and quick actions
              </Text>
            </Box>

            <HStack spacing={{ base: 1, md: 3 }}>
              {usingMock && (
                <Badge colorScheme="yellow" variant="subtle" px={2} py={1}>
                  Mock Data
                </Badge>
              )}

              <Tooltip label="Refresh list (API)" openDelay={300}>
                <IconButton
                  aria-label="Refresh list"
                  icon={<RepeatIcon />}
                  size="sm"
                  onClick={handleRefreshList}
                  variant="ghost"
                  rounded="md"
                  _hover={{
                    bg: useColorModeValue("gray.100", "whiteAlpha.100"),
                  }}
                />
              </Tooltip>

              <Tooltip
                label={`Switch to ${
                  colorMode === "light" ? "dark" : "light"
                } mode`}
                openDelay={300}
              >
                <IconButton
                  aria-label="Toggle theme"
                  icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                  onClick={toggleColorMode}
                  size="sm"
                  variant="ghost"
                  rounded="md"
                />
              </Tooltip>

              <Box position="relative">
                <Tooltip
                  label={
                    isSubscribed
                      ? "View Notifications"
                      : "Subscribe to notifications"
                  }
                  openDelay={300}
                >
                  <IconButton
                    aria-label="Notifications"
                    icon={<Icon as={Bell} />}
                    onClick={onOpen}
                    size="sm"
                    variant="ghost"
                    rounded="md"
                  />
                </Tooltip>
                {history?.length > 0 && (
                  <Badge
                    colorScheme="red"
                    rounded="full"
                    position="absolute"
                    top="-5px"
                    right="-5px"
                    fontSize="xs"
                    px={2}
                  >
                    {history?.length}
                  </Badge>
                )}
              </Box>

              <Tooltip label="Logout" openDelay={300}>
                <IconButton
                  aria-label="Logout"
                  icon={<LogOut />}
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  rounded="md"
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Row 2: Search + filters */}
          <Grid
            templateColumns={{ base: "1fr", md: "minmax(0, 1fr) 320px" }}
            gap={3}
            alignItems="center"
          >
            <InputGroup maxW="100%">
              <InputLeftElement pointerEvents="none">
                <Search2Icon
                  color={useColorModeValue("gray.500", "gray.400")}
                />
              </InputLeftElement>
              <Input
                placeholder="Search by ID or Customer"
                onChange={handleSearch}
                bg={cardBg}
                borderColor={borderColor}
                _focus={{ borderColor: "#1E3C7B" }}
                aria-label="Search inquiries"
              />
              <InputRightElement>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                >
                  Clear
                </Button>
              </InputRightElement>
            </InputGroup>

            <HStack
              spacing={2}
              justify={{ base: "flex-start", md: "flex-end" }}
            >
              <Select
                w="160px"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                bg={cardBg}
                borderColor={borderColor}
                color={textColor}
                size="sm"
                _focus={{ borderColor: "#7B1E1E" }}
                aria-label="Filter status"
              >
                <option>All</option>
                <option>High Priority</option>
                <option>Normal</option>
                <option>Pending</option>
              </Select>

              <Button
                leftIcon={<Search2Icon />}
                size="sm"
                colorScheme="blue"
                onClick={() => {
                  setPage(1);
                }}
                aria-label="Run search"
              >
                Search
              </Button>
            </HStack>
          </Grid>

          {/* Optional: error / mock controls */}
          {ctxError && (
            <Box>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>Failed to fetch from API</AlertTitle>
                  <AlertDescription display="block">
                    {ctxError?.message || "Unknown error"}
                  </AlertDescription>
                  <HStack mt={3}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchInquiries().catch(() => {})}
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="yellow"
                      onClick={() => {
                        applyMockFallback();
                        toast({
                          title: "Mock entries applied",
                          description: "UI is now showing mock data.",
                          status: "info",
                          duration: 3000,
                          isClosable: true,
                        });
                      }}
                    >
                      Show Mock Entries
                    </Button>
                  </HStack>
                </Box>
              </Alert>
            </Box>
          )}
        </VStack>
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
        ) : paginatedInquiries?.length > 0 ? (
          viewMode === "grid" ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {paginatedInquiries?.map((inq, index) => {
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
            <Button mt={4} onClick={() => fetchInquiries().catch(() => {})}>
              Retry Fetch
            </Button>
          </Flex>
        )}
      </Box>

      {totalPages > 1 && (
        <HStack justify="space-between" px={8} py={4}>
          <Text fontSize="sm" color={subText}>
            Showing {Math.min(filteredInquiries?.length, startIndex + 1)} –{" "}
            {Math.min(startIndex + pageSize, filteredInquiries?.length)} of{" "}
            {filteredInquiries?.length}
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
                  {history?.length > 0 && (
                    <Badge
                      colorScheme="red"
                      rounded="full"
                      position="absolute"
                      top="1"
                      right="1"
                      fontSize="0.7em"
                      px={1.5}
                    >
                      {history?.length}
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

            {history?.length > 0 && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={() => setHistory([])}
              >
                Clear
              </Button>
            )}

            {history?.length === 0 ? (
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
