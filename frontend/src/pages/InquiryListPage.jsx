// InquiryListPage.js
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
import { LayoutGrid, List } from "lucide-react"; // install lucide-react if not already

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, BellOff } from "react-feather"; // feather icons look better
import { useEffect } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  VStack,
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import React from "react";
import { API_BASE } from "../api/authApi";

// Mock Data
// Mock Data
const inquiries = Array.from({ length: 42 }, (_, i) => ({
  id: `Inq-${i + 1}`,
  qty: 10 + i, // just to vary a bit
  customer: `Customer Name with longer text that may overflow (${i + 1})`,
  broker: i % 2 === 0 ? `Broker Name with longer text too (${i + 1})` : null,
  sales: `Sales Person (${i + 1})`,
  status: i % 3 === 0 ? "High Priority" : i % 3 === 1 ? "Pending" : "Normal",

  // 🔹 Added items array
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

// inside InquiryCard:
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
    >
      <HStack
        spacing={2}
        px={3}
        py={1}
        rounded="full"
        align="center"
        justify="center"
        // bg={`${statusColor}.100`}
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

export default function InquiryListPage() {
  const { user } = useAuth();
  console.log({ user });
  const [isSubscribed, setIsSubscribed] = useState(false);

  const { colorMode, toggleColorMode } = useColorMode();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("viewMode") || "grid";
  });
  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);
  const pageSize = 6;

  // Debounced search handler
  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 500);
  }, []);

  // Filter + Pagination (memoized)
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchesFilter = filter === "All" ? true : inq.status === filter;
      const matchesSearch =
        inq.customer.toLowerCase().includes(search.toLowerCase()) ||
        inq.id.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const totalPages = Math.ceil(filteredInquiries.length / pageSize);
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

  // 🌗 Dynamic colors
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textHeadingColor = useColorModeValue("black", "white");
  const subText = useColorModeValue("gray.600", "gray.400");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [history, setHistory] = useState([]);

  // Fake history demo, you’d append real pushes here
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

  return (
    <Flex minH="100vh" bg={pageBg} direction="column">
      {/* Sticky Header */}
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
            Welcome {user},
            <br />
            <p fontWeight="Normal"> Here are your Pending Inquiries</p>
          </Heading>

          <HStack spacing={2}>
            {/* 🔔 Notification Bell with Badge */}
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
                  onClick={onOpen} // open drawer
                  variant="ghost"
                  size="lg"
                  rounded="full"
                />
              </Tooltip>

              {/* Badge overlay */}
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

            {/* 🌙 / ☀️ Theme Toggle */}
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
          </HStack>
        </HStack>

        {/* Filters */}
        <HStack mt={4} spacing={4}>
          <Input
            placeholder="Search by ID or Customer"
            onChange={handleSearch}
            bg={cardBg}
            borderColor={borderColor}
            maxW="300px"
            _focus={{ borderColor: "#1E3C7B" }}
          />
          <Select
            w="200px"
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

      {/* Inquiry Grid */}
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
        {paginatedInquiries.length > 0 ? (
          viewMode === "grid" ? (
            // --- Grid View ---
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {paginatedInquiries.map((inq, index) => (
                <InquiryCard
                  key={inq.id}
                  inquiry={inq}
                  index={index}
                  cardBg={cardBg}
                  borderColor={borderColor}
                  subText={subText}
                  textColor={textColor}
                  onClick={(inquiry) =>
                    navigate("/InquiryDetailPage", { state: { inquiry } })
                  }
                />
              ))}
            </SimpleGrid>
          ) : (
            // --- List View ---
            <VStack spacing={2} align="stretch">
              {paginatedInquiries.map((inq, index) => (
                <Flex
                  key={inq.id}
                  p={4}
                  rounded="md"
                  shadow="sm"
                  bg={cardBg}
                  border="1px solid"
                  borderColor={borderColor}
                  justify="space-between"
                  align="center"
                  _hover={{ shadow: "md", cursor: "pointer" }}
                  onClick={() =>
                    navigate("/InquiryDetailPage", { state: { inquiry: inq } })
                  }
                >
                  <HStack spacing={4}>
                    <Icon
                      as={StarIcon}
                      boxSize={4}
                      color={index % 2 === 0 ? "#1E3C7B" : "#7B1E1E"}
                    />
                    <Box>
                      <Text fontWeight="bold" color={textColor}>
                        {inq.id} ({inq.qty})
                      </Text>
                      <Text fontSize="sm" color={subText} noOfLines={1}>
                        {inq.customer}
                      </Text>
                    </Box>
                  </HStack>

                  <Badge
                    colorScheme={
                      inq.status === "High Priority"
                        ? "red"
                        : inq.status === "Pending"
                        ? "orange"
                        : "green"
                    }
                  >
                    {inq.status}
                  </Badge>
                </Flex>
              ))}
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
          </Flex>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="space-between" px={8} py={4}>
          {/* Left: Info */}
          <Text fontSize="sm" color={subText}>
            Showing {startIndex + 1} –{" "}
            {Math.min(startIndex + pageSize, filteredInquiries.length)} of{" "}
            {filteredInquiries.length}
          </Text>

          {/* Right: Pagination Controls */}
          <HStack spacing={1}>
            {/* <IconButton
              size="sm"
              variant="ghost"
              aria-label="First Page"
              icon={<ChevronLeftIcon />}
              onClick={() => setPage(1)}
              isDisabled={page === 1}
            /> */}

            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Previous Page"
              icon={<ArrowLeftIcon />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            />

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1 // show first, last, and around current
              )
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {/* Ellipsis before skipped pages */}
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

            {/* <IconButton
              size="sm"
              variant="ghost"
              aria-label="Last Page"
              icon={<ChevronRightIcon />}
              onClick={() => setPage(totalPages)}
              isDisabled={page === totalPages}
            /> */}
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

          {/* 🔔 Header with count */}
          <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
            <HStack justify="space-between" w="100%">
              {/* Left side: Icon + Label */}
              <HStack spacing={2}>
                {/* 🔔 Notification Bell with Badge */}
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
                      onClick={onOpen} // open drawer
                      variant="ghost"
                      size="lg"
                      rounded="full"
                    />
                  </Tooltip>

                  {/* Badge overlay */}
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

              {/* Right side: Count + Clear */}
            </HStack>
          </DrawerHeader>

          <DrawerBody px={4} py={5}>
            {/* Subscribe / Unsubscribe */}
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
            {/* Notifications list */}
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
