import {
  Box,
  Flex,
  Heading,
  VStack,
  Text,
  HStack,
  Button,
  Divider,
  useColorModeValue,
  Input,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import ConfirmDialog from "../components/Shared/ConfirmDialog";

/**
 * Helpers to normalize inquiry / item shapes so UI can use the same fields.
 */
const normalizeInquiryForUI = (maybe) => {
  if (!maybe) return null;

  // If the user already passed a normalized inquiry (id, items, customer...), return as-is
  if (maybe.id && maybe.items) return maybe;

  // If the payload is wrapped under .inquiry (sometimes state = { inquiry: {...} })
  const root = maybe.inquiry ?? maybe;

  // Read top-level fields from sample payload keys or fallbacks
  const id = root?.["Inquiry No"] ?? root?.id ?? root?.inquiryId ?? "Unknown";
  const customer =
    root?.["Customer Name"] ??
    root?.customer ??
    root?.buyer ??
    "Unknown Customer";
  const sales =
    root?.["Sales Person Name"] ??
    root?.["Broker Name"] ??
    root?.salesPerson ??
    root?.sales ??
    "N/A";

  // Items array under INQ_ITEM or items or lines
  const rawItems =
    Array.isArray(root?.INQ_ITEM) && root.INQ_ITEM.length
      ? root.INQ_ITEM
      : Array.isArray(root?.items) && root.items.length
      ? root.items
      : Array.isArray(root?.lines) && root.lines.length
      ? root.lines
      : [];

  // total qty sum if not provided
  const qty =
    root?.qty ??
    root?.totalQty ??
    root?.["Qty"] ??
    (rawItems.length
      ? rawItems.reduce((s, it) => s + Number(it?.QUANTITY ?? it?.qty ?? 0), 0)
      : 0);

  // Map items into UI-friendly objects (but keep _raw)
  const items = (rawItems || []).map((it, i) => {
    const src = it || {};
    return {
      id:
        src?.id ??
        src?.lineId ??
        (typeof src?.INQ_ITEM !== "undefined"
          ? String(src.INQ_ITEM)
          : `line-${i + 1}`),
      name:
        src?.MATERIAL ??
        src?.material ??
        src?.name ??
        src?.itemName ??
        src?.description ??
        `Item ${i + 1}`,
      qty: src?.QUANTITY ?? src?.quantity ?? src?.qty ?? 0,
      rate:
        src?.BASE_PRICE ??
        src?.basePrice ??
        src?.price ??
        src?.NEO_RATE ??
        src?.neoRate ??
        0,
      lastRate: src?.NEO_RATE ?? src?.lastRate ?? 0,
      grade: src?.GRADE ?? src?.grade ?? "-",
      winding: src?.WINDING ?? src?.winding ?? "-",
      pq: src?.PQ ?? src?.pq ?? "No",
      clq: src?.CLQ ?? src?.clq ?? "No",
      unit: src?.UNIT ?? src?.unit ?? null,
      currency: src?.WAERS ?? src?.currency ?? null,
      _raw: src,
    };
  });

  return {
    id,
    qty,
    customer,
    sales,
    items,
    _raw: root,
  };
};

const normalizeItemForUI = (maybeItem) => {
  if (!maybeItem) return null;

  // If already normalized (has id, name, qty, rate), return as-is
  if (maybeItem.id && maybeItem.name && typeof maybeItem.qty !== "undefined")
    return maybeItem;

  // Input might be the item itself or wrapped under .item
  const it = maybeItem.item ?? maybeItem;

  return {
    id:
      it?.id ??
      it?.lineId ??
      (typeof it?.INQ_ITEM !== "undefined"
        ? String(it.INQ_ITEM)
        : "unknown-item"),
    name:
      it?.name ??
      it?.MATERIAL ??
      it?.material ??
      it?.itemName ??
      it?.description ??
      "Unknown Item",
    qty: it?.qty ?? it?.QUANTITY ?? it?.quantity ?? 0,
    rate: it?.rate ?? it?.BASE_PRICE ?? it?.NEO_RATE ?? it?.price ?? 0,
    lastRate: it?.lastRate ?? it?.NEO_RATE ?? 0,
    grade: it?.grade ?? it?.GRADE ?? "-",
    winding: it?.winding ?? it?.WINDING ?? "-",
    pq: it?.pq ?? it?.PQ ?? "No",
    clq: it?.clq ?? it?.CLQ ?? "No",
    unit: it?.unit ?? it?.UNIT ?? null,
    currency: it?.currency ?? it?.WAERS ?? null,
    _raw: it,
  };
};

export default function NegotiationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  // state might be { inquiry: {...}, item: {...} } or { inquiry: normalizedObject, item: normalizedItem }
  const providedInquiry = state?.inquiry ?? state;
  const providedItem = state?.item ?? state?.selectedItem ?? state;

  // normalize for UI usage
  const inquiry = normalizeInquiryForUI(providedInquiry);
  const item = normalizeItemForUI(providedItem);

  // Theme colors
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.700", "gray.200");

  // Editable Approver rates (default 3 rows)
  const [approverRates, setApproverRates] = useState(
    Array(3).fill(item?.rate ?? 0)
  );

  const handleChange = (index, value) => {
    const newRates = [...approverRates];
    newRates[index] = value;
    setApproverRates(newRates);
  };

  // Confirm dialog
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  const handleAction = async () => {
    setLoading(true);

    try {
      switch (action) {
        case "Save":
          // await api.saveNegotiation(inquiry.id, item.id, approverRates);
          toast({ title: "Saved successfully ", status: "success" });
          break;
        case "Approve":
          // await api.approveItem(inquiry.id, item.id);
          toast({ title: "Item approved ", status: "success" });
          break;
        case "Reject":
          // await api.rejectItem(inquiry.id, item.id);
          toast({ title: "Item rejected ", status: "error" });
          break;
        default:
          break;
      }
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!inquiry || !item) {
    return (
      <Flex
        minH="100vh"
        bg={pageBg}
        align="center"
        justify="center"
        direction="column"
      >
        <Text fontSize="lg" color={textColor} mb={4}>
          No item selected for negotiation.
        </Text>
        <Button onClick={() => navigate("/inquiries")} colorScheme="blue">
          Back to List
        </Button>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg={pageBg} justify="center" p={0}>
      <Box w="100%" maxW="100%" bg={cardBg} rounded="2xl" shadow="xl" p={6}>
        {/* Breadcrumb */}
        <Breadcrumb mb={4} fontSize="sm">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/inquiries")}>
              Inquiry
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate(-1)}>Item</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Negotiation</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Sticky Inquiry Header */}
        <Box
          position="sticky"
          top="0"
          bg={cardBg}
          zIndex="5"
          p={3}
          borderBottom="1px solid"
          borderColor={borderColor}
          mb={4}
        >
          <Heading size="md" color={textColor}>
            {inquiry.id} ({inquiry.qty}) – {inquiry.customer}
          </Heading>
          <Text fontSize="sm" color="gray.500">
            {inquiry.sales}
          </Text>
        </Box>

        {/* Item Details */}
        <Box
          p={4}
          border="1px solid"
          borderColor={borderColor}
          rounded="lg"
          mb={6}
        >
          <Text fontWeight="semibold" mb={2} color={textColor}>
            {item.name} ({item.qty})
          </Text>
          <Text fontSize="sm" color={textColor}>
            Qty: {item.qty} | Rate: {item.rate}
          </Text>
          <Text fontSize="sm" color={textColor}>
            Grade: {item.grade} | Winding: {item.winding}
          </Text>
          <Text fontSize="sm" color={textColor}>
            PQ: {item.pq} | CLQ: {item.clq}
          </Text>
          <Text fontSize="sm" color={textColor}>
            Last Negotiated Rate: {item.lastRate}
          </Text>
        </Box>

        {/* Negotiation Table */}
        <Heading size="sm" mb={3} color={textColor}>
          Negotiation Table
        </Heading>
        <Table size="sm" variant="striped" colorScheme="gray" mb={6}>
          <Thead>
            <Tr>
              <Th>Approver Rate</Th>
              <Th>Sales Person Rate</Th>
            </Tr>
          </Thead>
          <Tbody>
            {approverRates.map((rate, idx) => {
              const isDifferent = Number(rate) !== Number(item.rate);
              return (
                <Tr key={idx}>
                  <Td>
                    <Input
                      type="number"
                      value={rate}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      borderColor={isDifferent ? "red.400" : borderColor}
                      bg={isDifferent ? "red.50" : undefined}
                    />
                  </Td>
                  <Td>
                    <Text>{item.rate}</Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        {/* Save + Action Buttons */}
        <VStack spacing={4}>
          <Button
            colorScheme="blue"
            w="100px"
            isLoading={loading && action === "Save"}
            onClick={() => {
              setAction("Save");
              onOpen();
            }}
          >
            Save
          </Button>
          <HStack spacing={4} w="min-content">
            <Button
              colorScheme="green"
              w="100px"
              isLoading={loading && action === "Approve"}
              onClick={() => {
                setAction("Approve");
                onOpen();
              }}
            >
              Approve
            </Button>
            <Button
              colorScheme="red"
              w="100px"
              isLoading={loading && action === "Reject"}
              onClick={() => {
                setAction("Reject");
                onOpen();
              }}
            >
              Reject
            </Button>
          </HStack>
        </VStack>

        <Divider my={6} />
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        action={action}
        onConfirm={handleAction}
      />
    </Flex>
  );
}
