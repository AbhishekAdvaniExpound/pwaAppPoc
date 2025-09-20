import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
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
  FormControl,
  FormErrorMessage,
  useBreakpointValue,
  Stack,
  Avatar,
  Badge,
  Icon,
  Spacer,
  Collapse,
  Tooltip,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import { API_BASE } from "../api/authApi";
import { InfoOutlineIcon, CheckIcon, ArrowBackIcon } from "@chakra-ui/icons";

/* ---------------------------
   Normalize helpers (same as you provided)
   --------------------------- */
const normalizeInquiryForUI = (maybe) => {
  if (!maybe) return null;
  if (maybe.id && maybe.items) return maybe;
  const root = maybe.inquiry ?? maybe;
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
  const rawItems =
    Array.isArray(root?.INQ_ITEM) && root.INQ_ITEM.length
      ? root.INQ_ITEM
      : Array.isArray(root?.items) && root.items.length
      ? root.items
      : Array.isArray(root?.lines) && root.lines.length
      ? root.lines
      : [];
  const qty =
    root?.qty ??
    root?.totalQty ??
    root?.["Qty"] ??
    (rawItems.length
      ? rawItems.reduce((s, it) => s + Number(it?.QUANTITY ?? it?.qty ?? 0), 0)
      : 0);
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
  if (maybeItem.id && maybeItem.name && typeof maybeItem.qty !== "undefined")
    return maybeItem;
  const it = maybeItem.item ?? maybeItem;
  return {
    id:
      it?.id ??
      it?.lineId ??
      (typeof it?.INQ_ITEM !== "undefined"
        ? String(it?.INQ_ITEM)
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

/* ---------------------------
   Small UI helpers
   --------------------------- */
const StatusBadge = ({ children }) => (
  <Badge px={2} py={0.5} rounded="full" colorScheme="teal" fontSize="xs">
    {children}
  </Badge>
);

/* ---------------------------
   Main component
   --------------------------- */
export default function NegotiationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const providedInquiry = state?.inquiry ?? state;
  const providedItem = state?.item ?? state?.selectedItem ?? state;
  const inquiry = normalizeInquiryForUI(providedInquiry);
  const item = normalizeItemForUI(providedItem);

  // color tokens
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const muted = useColorModeValue("gray.600", "gray.300");

  // hooks (always at top)
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const approverRefs = [useRef(null), useRef(null), useRef(null)];
  const [negotiation, setNegotiation] = useState({
    MANDT: "120",
    VBELN: inquiry?.id ?? "",
    POSNR: item?.id ?? 0,
    C1_QTY: "",
    A1_QTY: "",
    C2_QTY: "",
    A2_QTY: "",
    C3_QTY: "",
    A3_QTY: "",
    R1_TEXT: "",
    R2_TEXT: "",
    R3_TEXT: "",
    C1_UNAME: "",
    C2_UNAME: "",
    C3_UNAME: "",
    A1_UNAME: "",
    A2_UNAME: "",
    A3_UNAME: "",
  });
  const [lockedApprovers, setLockedApprovers] = useState([false, false, false]);

  const goBack = () => {
    try {
      // history length heuristic: if > 2, we likely can go back (page loaded from app navigation)
      if (window.history && window.history.length > 2) {
        navigate(-1);
      } else {
        navigate("/inquiries");
      }
    } catch (err) {
      navigate("/inquiries");
    }
  };

  // breakpoint hook (always call)
  const isMobile = useBreakpointValue({ base: true, md: false });

  // small util
  const isMeaningfulValue = (v) => {
    if (v === null || typeof v === "undefined") return false;
    const s = String(v).trim();
    if (s === "") return false;
    const n = Number(s);
    if (isNaN(n)) return true;
    return n > 0;
  };

  const currentUserName =
    (typeof window !== "undefined" &&
      window.__USER__ &&
      window.__USER__.name) ??
    (inquiry?.sales && typeof inquiry.sales === "string"
      ? inquiry.sales
      : "CurrentUser");

  const getPaddedPosnr = (posnr) =>
    String(posnr ?? negotiation.POSNR ?? item?.id ?? 0).padStart(6, "0");

  // fetch negotiation row
  useEffect(() => {
    if (!inquiry?.id || !item?.id) return;

    const fetchNegotiation = async () => {
      try {
        const url = `${API_BASE}/api/inquiryRoutes/getNegotiation/${
          inquiry.id
        }/${getPaddedPosnr(item.id)}`;
        const resp = await axios.get(url);
        const raw = resp?.data;
        const sapRow = raw && raw.data ? raw.data : raw;

        if (!sapRow) {
          console.warn("No negotiation row in response", resp.data);
          return;
        }

        const mapped = {
          MANDT: sapRow.MANDT ?? "120",
          VBELN: sapRow.VBELN ?? inquiry.id ?? "",
          POSNR: String(sapRow.POSNR ?? item.id ?? 0),
          C1_QTY: sapRow.C1_QTY == null ? "" : String(sapRow.C1_QTY),
          A1_QTY: sapRow.A1_QTY == null ? "" : String(sapRow.A1_QTY),
          C2_QTY: sapRow.C2_QTY == null ? "" : String(sapRow.C2_QTY),
          A2_QTY: sapRow.A2_QTY == null ? "" : String(sapRow.A2_QTY),
          C3_QTY: sapRow.C3_QTY == null ? "" : String(sapRow.C3_QTY),
          A3_QTY: sapRow.A3_QTY == null ? "" : String(sapRow.A3_QTY),
          R1_TEXT: sapRow.R1_TEXT ?? "",
          R2_TEXT: sapRow.R2_TEXT ?? "",
          R3_TEXT: sapRow.R3_TEXT ?? "",
          C1_UNAME: sapRow.C1_UNAME ?? "",
          C2_UNAME: sapRow.C2_UNAME ?? "",
          C3_UNAME: sapRow.C3_UNAME ?? "",
          A1_UNAME: sapRow.A1_UNAME ?? "",
          A2_UNAME: sapRow.A2_UNAME ?? "",
          A3_UNAME: sapRow.A3_UNAME ?? "",
        };

        setNegotiation((prev) => ({ ...prev, ...mapped }));
        setLockedApprovers([
          isMeaningfulValue(mapped.A1_QTY),
          isMeaningfulValue(mapped.A2_QTY),
          isMeaningfulValue(mapped.A3_QTY),
        ]);
      } catch (err) {
        console.error("Failed to fetch negotiation:", err);
        toast({
          title: "Failed to load negotiation",
          description: err?.message ?? "Network error",
          status: "error",
        });
      }
    };

    fetchNegotiation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry?.id, item?.id]);

  // handlers
  const handleNegotiationChange = (key, value) =>
    setNegotiation((prev) => ({ ...prev, [key]: value }));

  const handleApproverChange = (idx, val) => {
    const aKey = `A${idx + 1}_QTY`;
    const aUserKey = `A${idx + 1}_UNAME`;
    setNegotiation((prev) => {
      const next = { ...prev, [aKey]: val };
      if (val) next[aUserKey] = prev[aUserKey] || currentUserName;
      return next;
    });
  };

  const focusNextApprover = (idx) => {
    const nextRef = approverRefs[idx + 1];
    if (nextRef && nextRef.current) nextRef.current.focus();
  };

  const isApproverDisabled = (idx) => {
    if (idx === 0) return false;
    const prevAKey = `A${idx}_QTY`;
    return !negotiation[prevAKey];
  };

  const validateSequentialApprovers = () => {
    const rowErrors = {};
    for (let i = 2; i <= 3; i++) {
      const aKey = `A${i}_QTY`;
      const prevKey = `A${i - 1}_QTY`;
      if (negotiation[aKey] && !negotiation[prevKey]) {
        rowErrors[i - 1] = `Fill A${i - 1} before A${i}.`;
      }
    }
    const anyApproverFilled = !!(
      negotiation.A1_QTY ||
      negotiation.A2_QTY ||
      negotiation.A3_QTY
    );

    const ok = Object.keys(rowErrors).length === 0;
    let message = null;
    if (!ok) message = "Please fix sequential approver gaps.";
    return { ok, message, rowErrors, anyApproverFilled };
  };

  const buildPayload = () => {
    const payload = {
      MANDT: negotiation.MANDT ?? "120",
      VBELN: negotiation.VBELN ?? inquiry?.id ?? "",
      POSNR: Number(negotiation.POSNR ?? item?.id ?? 0),
      C1_QTY: negotiation.C1_QTY ?? 0,
      A1_QTY: negotiation.A1_QTY ?? 0,
      C2_QTY: negotiation.C2_QTY ?? 0,
      A2_QTY: negotiation.A2_QTY ?? 0,
      C3_QTY: negotiation.C3_QTY ?? 0,
      A3_QTY: negotiation.A3_QTY ?? 0,
      R1_TEXT: negotiation.R1_TEXT ?? "",
      R2_TEXT: negotiation.R2_TEXT ?? "",
      R3_TEXT: negotiation.R3_TEXT ?? "",
      C1_UNAME: negotiation.C1_UNAME ?? "",
      C2_UNAME: negotiation.C2_UNAME ?? "",
      C3_UNAME: negotiation.C3_UNAME ?? "",
      A1_UNAME: negotiation.A1_UNAME ?? "",
      A2_UNAME: negotiation.A2_UNAME ?? "",
      A3_UNAME: negotiation.A3_UNAME ?? "",
    };

    ["C1_QTY", "A1_QTY", "C2_QTY", "A2_QTY", "C3_QTY", "A3_QTY"].forEach(
      (k) => {
        const v = payload[k];
        if (v === "") payload[k] = 0;
        else if (typeof v === "string" && !isNaN(v)) payload[k] = Number(v);
      }
    );

    return payload;
  };

  const callSaveOrApprove = async (mode) => {
    const seqValid = validateSequentialApprovers();
    if (!seqValid.ok) {
      toast({
        title: "Validation failed",
        description: seqValid.message,
        status: "error",
      });
      return;
    }

    if (mode === "Approve" && !seqValid.anyApproverFilled) {
      toast({
        title: "Cannot approve",
        description: "No approver rate provided. Fill at least A1 to approve.",
        status: "error",
      });
      return;
    }

    const payload = buildPayload();

    try {
      setLoading(true);
      const url = `${API_BASE}/api/inquiryRoutes/postNegotiation`;
      const config = {
        method: "post",
        url,
        data: payload,
      };

      const resp = await axios.request(config);

      if (mode === "Save") {
        toast({ title: "Saved successfully", status: "success" });
      } else if (mode === "Approve") {
        toast({ title: "Approved successfully", status: "success" });
      } else if (mode === "Reject") {
        toast({ title: "Rejected", status: "warning" });
      }

      if (resp?.data) {
        setNegotiation((prev) => ({ ...prev, ...resp.data }));
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Server error",
        description: err?.message || "Failed to save negotiation",
        status: "error",
      });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleAction = async () => {
    if (!action) return;
    await callSaveOrApprove(action);
  };

  const validation = validateSequentialApprovers();

  // quick empty state
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

  const rows = [0, 1, 2];

  return (
    <Flex minH="100vh" bg={pageBg} justify="center" p={{ base: 1, md: 1 }}>
      <Box
        w="100%"
        maxW="100%"
        bg={cardBg}
        rounded="2xl"
        shadow="xl"
        p={{ base: 4, md: 6 }}
      >
        {/* Back + breadcrumb row (logical back behaviour + breadcrumb trail) */}
        <Box mb={4}>
          <HStack spacing={3} align="center">
            {/* Logical Back button */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowBackIcon />}
              onClick={goBack}
              aria-label="Go back"
            >
              Back
            </Button>
          </HStack>
        </Box>

        {/* Header */}
        <Grid
          templateColumns={{ base: "1fr", md: "auto 1fr auto" }}
          gap={4}
          alignItems="center"
          mb={4}
        >
          <GridItem>
            <Avatar
              name={inquiry.customer}
              size="md"
              bg="teal.500"
              color="white"
            />
          </GridItem>

          <GridItem>
            <Heading size="md" color={textColor}>
              {inquiry.id}{" "}
              <Text as="span" color={muted} fontSize="sm">
                ({inquiry.qty})
              </Text>
            </Heading>
            <Text fontSize="sm" color={muted} mt={1}>
              {inquiry.customer} •{" "}
              <Text as="span" color="muted">
                {inquiry.sales}
              </Text>
            </Text>
          </GridItem>

          <GridItem>
            <HStack
              spacing={2}
              justify={{ base: "flex-start", md: "flex-end" }}
            >
              <Tooltip label="Negotiation info">
                <Button
                  leftIcon={<InfoOutlineIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast({
                      title: "Info",
                      description:
                        "Enter seller & approver rates to negotiate.",
                      status: "info",
                    })
                  }
                >
                  Info
                </Button>
              </Tooltip>
              <StatusBadge>Negotiation</StatusBadge>
            </HStack>
          </GridItem>
        </Grid>

        {/* Item summary */}
        <Box
          p={4}
          border="1px solid"
          borderColor={borderColor}
          rounded="lg"
          mb={6}
          bg={cardBg}
        >
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="semibold" color={textColor}>
                {item.name}
              </Text>
              <Text fontSize="sm" color={muted} mt={1}>
                {item.qty} units • Rate {item.rate}
              </Text>
            </Box>

            <HStack spacing={4}>
              <Box textAlign="right">
                <Text fontSize="sm" color={muted}>
                  Last rate
                </Text>
                <Text fontWeight="semibold" color={textColor}>
                  {item.lastRate}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="sm" color={muted}>
                  Grade
                </Text>
                <Text fontWeight="semibold" color={textColor}>
                  {item.grade}
                </Text>
              </Box>
            </HStack>
          </HStack>

          <HStack mt={3} spacing={3}>
            <Text fontSize="sm" color={muted}>
              Winding: {item.winding}
            </Text>
            <Text fontSize="sm" color={muted}>
              PQ: {item.pq}
            </Text>
            <Text fontSize="sm" color={muted}>
              CLQ: {item.clq}
            </Text>
          </HStack>
        </Box>

        <Heading size="sm" mb={3} color={textColor}>
          Negotiation
        </Heading>

        {/* Mobile stacked cards */}
        {isMobile ? (
          <VStack spacing={4} align="stretch" mb={6}>
            {rows.map((rIdx) => {
              const stage = rIdx + 1;
              const cKey = `C${stage}_QTY`;
              const aKey = `A${stage}_QTY`;
              const rKey = `R${stage}_TEXT`;
              const aUserKey = `A${stage}_UNAME`;
              const rowError =
                validation.rowErrors?.[stage] ??
                validation.rowErrors?.[rIdx + 1];

              return (
                <Box
                  key={stage}
                  p={4}
                  bg={cardBg}
                  rounded="lg"
                  shadow="sm"
                  border="1px solid"
                  borderColor={rowError ? "red.200" : borderColor}
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="semibold">Stage {stage}</Text>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color={muted}>
                        Approver
                      </Text>
                      <Text fontSize="xs" color={muted} fontWeight="semibold">
                        {negotiation[aUserKey] || "-"}
                      </Text>
                    </HStack>
                  </HStack>

                  <VStack spacing={3} align="stretch">
                    <FormControl>
                      <Text fontSize="xs" color={muted}>
                        Seller Rate (C{stage})
                      </Text>
                      <Input
                        type="number"
                        value={negotiation[cKey] ?? ""}
                        onChange={(e) =>
                          handleNegotiationChange(cKey, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNextApprover(rIdx);
                          }
                        }}
                        disabled={
                          isApproverDisabled(rIdx) || lockedApprovers[rIdx]
                        }
                        rounded="md"
                        px={3}
                        py={2}
                        aria-label={`Seller rate stage ${stage}`}
                      />
                    </FormControl>

                    <FormControl isInvalid={!!rowError}>
                      <Text fontSize="xs" color={muted}>
                        Approver Rate (A{stage})
                      </Text>
                      <Input
                        ref={approverRefs[rIdx]}
                        type="number"
                        value={negotiation[aKey] ?? ""}
                        onChange={(e) =>
                          handleApproverChange(rIdx, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNextApprover(rIdx);
                          }
                        }}
                        disabled={
                          isApproverDisabled(rIdx) || lockedApprovers[rIdx]
                        }
                        rounded="md"
                        px={3}
                        py={2}
                        aria-label={`Approver rate stage ${stage}`}
                      />
                      {rowError && (
                        <FormErrorMessage>{rowError}</FormErrorMessage>
                      )}
                    </FormControl>

                    <FormControl>
                      <Text fontSize="xs" color={muted}>
                        Remarks
                      </Text>
                      <Input
                        value={negotiation[rKey] ?? ""}
                        onChange={(e) =>
                          handleNegotiationChange(rKey, e.target.value)
                        }
                        disabled={lockedApprovers[rIdx]}
                        rounded="md"
                        px={3}
                        py={2}
                        aria-label={`Remarks stage ${stage}`}
                      />
                    </FormControl>
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        ) : (
          /* Desktop / Tablet table with horizontal fallback */
          <Box overflowX="auto" mb={6}>
            <Box minW="760px">
              <Table size="sm" variant="striped" colorScheme="gray">
                <Thead>
                  <Tr>
                    <Th>Stage</Th>
                    <Th>Seller Rate (C#)</Th>
                    <Th>Approver Rate (A#)</Th>
                    <Th>Approver Name</Th>
                    <Th>Remarks</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((rIdx) => {
                    const stage = rIdx + 1;
                    const cKey = `C${stage}_QTY`;
                    const aKey = `A${stage}_QTY`;
                    const rKey = `R${stage}_TEXT`;
                    const aUserKey = `A${stage}_UNAME`;
                    const rowError =
                      validation.rowErrors?.[stage] ??
                      validation.rowErrors?.[rIdx + 1];

                    return (
                      <Tr key={stage}>
                        <Td>{`Stage ${stage}`}</Td>
                        <Td>
                          <Input
                            type="number"
                            value={negotiation[cKey] ?? ""}
                            onChange={(e) =>
                              handleNegotiationChange(cKey, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                focusNextApprover(rIdx);
                              }
                            }}
                            disabled={
                              isApproverDisabled(rIdx) || lockedApprovers[rIdx]
                            }
                            rounded="md"
                            px={3}
                            py={2}
                            aria-label={`Seller rate stage ${stage}`}
                          />
                        </Td>
                        <Td>
                          <FormControl isInvalid={!!rowError}>
                            <Input
                              ref={approverRefs[rIdx]}
                              type="number"
                              value={negotiation[aKey] ?? ""}
                              onChange={(e) =>
                                handleApproverChange(rIdx, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusNextApprover(rIdx);
                                }
                              }}
                              disabled={
                                isApproverDisabled(rIdx) ||
                                lockedApprovers[rIdx]
                              }
                              rounded="md"
                              px={3}
                              py={2}
                              aria-label={`Approver rate stage ${stage}`}
                            />
                            {rowError && (
                              <FormErrorMessage>{rowError}</FormErrorMessage>
                            )}
                          </FormControl>
                        </Td>
                        <Td>
                          <Text>{negotiation[aUserKey] || "-"}</Text>
                        </Td>
                        <Td>
                          <Input
                            value={negotiation[rKey] ?? ""}
                            onChange={(e) =>
                              handleNegotiationChange(rKey, e.target.value)
                            }
                            disabled={lockedApprovers[rIdx]}
                            rounded="md"
                            px={3}
                            py={2}
                            aria-label={`Remarks stage ${stage}`}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Desktop actions inline, mobile will also see fixed bottom bar */}
        <HStack spacing={4} align="center" mb={4}>
          <Button
            colorScheme="blue"
            isLoading={loading && action === "Save"}
            onClick={() => {
              setAction("Save");
              onOpen();
            }}
          >
            Save
          </Button>

          <HStack spacing={3}>
            <Button
              colorScheme="green"
              isLoading={loading && action === "Approve"}
              onClick={() => {
                setAction("Approve");
                onOpen();
              }}
              isDisabled={!validation.ok || !validation.anyApproverFilled}
            >
              Approve
            </Button>

            <Button
              colorScheme="red"
              isLoading={loading && action === "Reject"}
              onClick={() => {
                setAction("Reject");
                onOpen();
              }}
            >
              Reject
            </Button>
          </HStack>

          <Spacer />

          {/* <HStack spacing={3}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // helpful quick-fill: copy seller C1 -> approver A1 if empty (non-destructive)
                if (!negotiation.A1_QTY && negotiation.C1_QTY) {
                  setNegotiation((prev) => ({
                    ...prev,
                    A1_QTY: prev.C1_QTY,
                    A1_UNAME: prev.A1_UNAME || currentUserName,
                  }));
                  toast({
                    title: "Copied",
                    description: "C1 copied into A1",
                    status: "info",
                  });
                } else {
                  toast({
                    title: "No action",
                    description: "Either A1 is set or C1 is empty",
                    status: "warning",
                  });
                }
              }}
            >
              Quick copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // toggle lock preview (not persistent)
                setLockedApprovers((p) => p.map(Boolean));
                toast({ title: "Locked preview", status: "info" });
              }}
            >
              Lock preview
            </Button>
          </HStack> */}
        </HStack>
      </Box>

      {/* Mobile fixed action bar */}
      {/* {isMobile && (
        <Collapse in={true} animateOpacity>
          <Box
            position="fixed"
            left="0"
            right="0"
            bottom="0"
            bg={cardBg}
            borderTop="1px solid"
            borderColor={borderColor}
            // p={3}
            shadow="lg"
          >
            <HStack maxW="1000px" mx="auto" spacing={3}>
              <Button
                flex="1"
                size="sm"
                colorScheme="blue"
                isLoading={loading && action === "Save"}
                onClick={() => {
                  setAction("Save");
                  onOpen();
                }}
              >
                Save
              </Button>
              <Button
                flex="1"
                size="sm"
                colorScheme="green"
                isLoading={loading && action === "Approve"}
                onClick={() => {
                  setAction("Approve");
                  onOpen();
                }}
                isDisabled={!validation.ok || !validation.anyApproverFilled}
              >
                Approve
              </Button>
              <Button
                flex="1"
                size="sm"
                colorScheme="red"
                isLoading={loading && action === "Reject"}
                onClick={() => {
                  setAction("Reject");
                  onOpen();
                }}
              >
                Reject
              </Button>
            </HStack>
          </Box>
        </Collapse>
      )} */}

      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        action={action}
        onConfirm={handleAction}
      />
    </Flex>
  );
}
