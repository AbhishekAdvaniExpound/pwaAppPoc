// InquiryDetailPage.js (robust — handles prop, location.state, and :id)
import {
  Box,
  Flex,
  Heading,
  Text,
  HStack,
  Button,
  Divider,
  useColorModeValue,
  Icon,
  Badge,
  Tooltip,
  SimpleGrid,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import {
  StarIcon,
  EditIcon,
  CheckCircleIcon,
  CloseIcon,
  DownloadIcon,
} from "@chakra-ui/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import { useInquiries } from "../context/InquiryContext";

export default function InquiryDetailPage({ inquiryparams = null }) {
  const { state } = useLocation();
  const { id: paramId } = useParams(); // if your route is /inquiries/:id
  const navigate = useNavigate();
  const toast = useToast();

  console.log("InquiryDetailPage init", {
    inquiryparams,
    locationState: state,
    paramId,
  });

  // Sources (priority order)
  const propInquiry = inquiryparams ?? null;
  const stateInquiry = state?.inquiry ?? null;
  const idFromState = state?.inquiry?.id ?? null; // in case state contains just id or full object
  const idFromUrl = paramId ?? null;

  const {
    currentInquiry,
    fetchInquiryById,
    loading: ctxLoading,
  } = useInquiries();

  const [inquirySource, setInquirySource] = useState(
    propInquiry || stateInquiry || null
  );
  const [localLoading, setLocalLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // guard so we don't fetch same id repeatedly
  const loadedIdRef = useRef(null);

  /* ---------- Helpers ---------- */
  // Normalize id value (string/number) to string or null
  const resolveId = (maybe) => {
    if (maybe === undefined || maybe === null) return null;
    // if it's an object with id prop
    if (typeof maybe === "object") return maybe.id ?? null;
    return String(maybe);
  };

  // Safe fetch wrapper: handles responses that return either {data:...} or the object directly
  const safeFetchById = async (id) => {
    if (!id) throw new Error("safeFetchById: no id provided");
    if (typeof fetchInquiryById !== "function")
      throw new Error("safeFetchById: fetchInquiryById is not a function");

    const raw = await fetchInquiryById(id);
    // try to be permissive: handle axios-like responses and plain objects
    if (!raw) return null;
    if (raw.data) return raw.data;
    return raw;
  };
  /* ---------- useEffect: simple context-backed loader ---------- */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // 1) prefer direct prop
      if (propInquiry) {
        if (mounted) {
          setInquirySource(propInquiry);
        }
        return;
      }

      // 2) prefer full object in location.state
      if (stateInquiry && stateInquiry.items) {
        if (mounted) {
          setInquirySource(stateInquiry);
        }
        return;
      }

      // 3) prefer currentInquiry already in context
      if (currentInquiry) {
        // if param/id present but different from currentInquiry, we'll consider refetch below
        if (mounted) setInquirySource(currentInquiry);
      }

      // 4) if we still don't have a source, but have an id in state or url, fetch it
      const idToFetch = idFromState || idFromUrl;
      if (
        !inquirySource &&
        idToFetch &&
        typeof fetchInquiryById === "function"
      ) {
        try {
          setLocalLoading(true);
          const fetched = await fetchInquiryById(idToFetch); // context wrapper will set currentInquiry
          if (!mounted) return;
          setInquirySource(fetched || null);
        } catch (err) {
          console.error("fetchInquiryById error:", err);
          if (mounted) setInquirySource(null);
        } finally {
          if (mounted) setLocalLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // keep deps limited and stable
  }, [inquiryparams, state, paramId, fetchInquiryById, currentInquiry]);

  /* ---------- handleConfirm: simple refetch using context wrapper ---------- */
  const handleConfirm = async () => {
    setIsDialogOpen(false);
    setLocalLoading(true);

    try {
      toast({
        title: "Action successful",
        description: `${action} completed.`,
        status: "success",
      });

      // prefer the inquiry id from current inquiry or inquirySource
      const idToRefetch =
        inquiry?.id ?? inquirySource?.id ?? idFromState ?? idFromUrl;
      if (idToRefetch && typeof fetchInquiryById === "function") {
        // fetch again via your context wrapper (which sets currentInquiry)
        const updated = await fetchInquiryById(idToRefetch);
        setInquirySource(updated || inquirySource);
      }
    } catch (err) {
      console.error("handleConfirm error:", err);
      toast({
        title: "Action failed",
        description: "Something went wrong.",
        status: "error",
      });
    } finally {
      setLocalLoading(false);
    }

    if (action?.toLowerCase().includes("negotiate") && selectedItem) {
      navigate("/NegotiationPage", {
        state: { inquiry: inquirySource, item: selectedItem },
      });
    }
  };

  /* ---------- normalizeInquiry: handle nested `original` gracefully ---------- */
  const normalizeInquiry = (raw) => {
    if (!raw) return null;

    // helper to get items array safely
    const itemsArr = Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.lines)
      ? raw.lines
      : [];

    return {
      id: raw.id || raw.inquiryId || raw["Inquiry No"] || "Unknown",
      qty: raw.qty ?? raw.totalQty ?? raw["Qty"] ?? 0,
      customer:
        raw.customer ||
        raw.customerName ||
        raw["Customer Name"] ||
        "Unknown Customer",
      sales: raw.sales || raw.salesPerson || raw["sales"] || "N/A",
      items: itemsArr.map((it, i) => {
        const src = it.original || it; // unwrap if nested
        return {
          id: src.id ?? src.lineId ?? src["LineId"] ?? `line-${i + 1}`,
          name:
            src.name ??
            src.itemName ??
            src["Customer Name"] ??
            src["ItemName"] ??
            `Item ${i + 1}`,
          qty: src.qty ?? src.quantity ?? src["Qty"] ?? 0,
          rate: src.rate ?? src.price ?? src["Rate"] ?? 0,
          grade: src.grade ?? src["Grade"] ?? "-",
          winding: src.winding ?? src["Winding"] ?? "-",
          pq: src.pq ?? src["PQ"] ?? "No",
          clq: src.clq ?? src["CLQ"] ?? "No",
          lastRate: src.lastRate ?? src["Last Rate"] ?? 0,
          status: src.status ?? src["Status"] ?? "Pending",
        };
      }),
    };
  };

  const inquiry = normalizeInquiry(inquirySource);
  const isLoading = ctxLoading || localLoading;

  // actions (same as yours)
  const openConfirm = (actionText, item = null) => {
    setAction(actionText);
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  // theme tokens and UI rendering (same as yours)...
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.700", "gray.200");

  if (isLoading)
    return (
      <Flex minH="100vh" bg={pageBg} align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    );

  if (!inquiry) {
    return (
      <Flex
        minH="100vh"
        bg={pageBg}
        align="center"
        justify="center"
        direction="column"
        gap={4}
      >
        <Text fontSize="lg" color={textColor}>
          No inquiry selected / found.
        </Text>
        <Button onClick={() => navigate("/inquiries")} colorScheme="blue">
          Back to List
        </Button>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg={pageBg} justify="center" p={4}>
      {/* paste your existing UI here (header, items list, ConfirmDialog etc.) */}
      <Box w="100%" maxW="1200px" bg={cardBg} rounded="2xl" shadow="xl" p={6}>
        <Breadcrumb fontSize="sm" mb={4} color={textColor}>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/inquiries")}>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/inquiries")}>
              Inquiries
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{inquiry.id}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <Flex justify="flex-end" mb={4}>
          <Tooltip label="View PDF" hasArrow>
            <IconButton
              aria-label="View PDF"
              icon={<DownloadIcon boxSize={3} />}
              colorScheme="red"
              onClick={() =>
                toast({
                  title: "PDF",
                  description: "Not implemented",
                  status: "info",
                })
              }
            />
          </Tooltip>
        </Flex>

        <Box
          position="sticky"
          top="0"
          bg={cardBg}
          zIndex="10"
          border="1px solid"
          borderColor={borderColor}
          mb={4}
          p={4}
          rounded="lg"
          shadow="sm"
        >
          <HStack spacing={3}>
            <Icon as={StarIcon} color="red.500" />
            <Text fontWeight="bold" fontSize="lg" color={textColor}>
              {inquiry.id} ({inquiry.qty}) – {inquiry.customer}
            </Text>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            {inquiry.sales}
          </Text>
        </Box>

        <Heading size="md" mb={4} color={textColor}>
          List of Items
        </Heading>

        {inquiry.items?.length ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {inquiry.items.map((item) => {
              const status = item.status || "Pending";
              const statusColor =
                status === "Approved"
                  ? "green"
                  : status === "Rejected"
                  ? "red"
                  : status === "Negotiated"
                  ? "yellow"
                  : "gray";
              return (
                <Box
                  key={item.id}
                  p={4}
                  border="1px solid"
                  borderColor={borderColor}
                  rounded="lg"
                  bg={cardBg}
                  shadow="sm"
                  position="relative"
                >
                  <Badge
                    position="absolute"
                    top={3}
                    right={3}
                    colorScheme={statusColor}
                  >
                    {status}
                  </Badge>
                  <Text fontWeight="semibold" mb={2}>
                    {item.name} ({item.qty})
                  </Text>
                  <Text fontSize="sm">
                    Qty: {item.qty} | Rate: {item.rate}
                  </Text>
                  <Text fontSize="sm">
                    Grade: {item.grade} | Winding: {item.winding}
                  </Text>
                  <Text fontSize="sm">
                    PQ: {item.pq} | CLQ: {item.clq}
                  </Text>
                  <Text fontSize="sm" mb={3}>
                    Last Negotiated Rate: {item.lastRate}
                  </Text>

                  <HStack spacing={3}>
                    <Tooltip label="Send for negotiation" hasArrow>
                      <Button
                        size="sm"
                        colorScheme="yellow"
                        leftIcon={<EditIcon />}
                        onClick={() => openConfirm("Negotiate this item", item)}
                      >
                        Negotiate
                      </Button>
                    </Tooltip>
                    <Tooltip label="Approve this item" hasArrow>
                      <Button
                        size="sm"
                        colorScheme="green"
                        leftIcon={<CheckCircleIcon />}
                        onClick={() => openConfirm("Approve this item", item)}
                      >
                        Approve
                      </Button>
                    </Tooltip>
                    <Tooltip label="Reject this item" hasArrow>
                      <Button
                        size="sm"
                        colorScheme="red"
                        leftIcon={<CloseIcon />}
                        onClick={() => openConfirm("Reject this item", item)}
                      >
                        Reject
                      </Button>
                    </Tooltip>
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
        ) : (
          <Text color={textColor}>No items found.</Text>
        )}

        <Divider my={6} />

        <HStack justify="center" spacing={4}>
          <Button
            colorScheme="green"
            leftIcon={<CheckCircleIcon />}
            onClick={() => openConfirm("Approve All items")}
          >
            Approve All
          </Button>
          <Button
            colorScheme="red"
            leftIcon={<CloseIcon />}
            onClick={() => openConfirm("Reject All items")}
          >
            Reject All
          </Button>
        </HStack>
      </Box>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleConfirm}
        action={action}
        item={selectedItem}
      />
    </Flex>
  );
}
