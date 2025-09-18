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
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import { API_BASE } from "../api/authApi";

/* keep your normalizeInquiryForUI and normalizeItemForUI as-is (paste them here) */
/* ... (USE the same helpers you shared earlier) */

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
  const providedInquiry = state?.inquiry ?? state;
  const providedItem = state?.item ?? state?.selectedItem ?? state;
  const inquiry = normalizeInquiryForUI(providedInquiry);
  const item = normalizeItemForUI(providedItem);

  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.700", "gray.200");

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);

  // refs for approver inputs to auto-focus next one
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

  const toggleLockApprover = (idx) => {
    const aKey = `A${idx + 1}_QTY`;
    const v = negotiation[aKey];

    // Do not allow locking if value is empty or zero
    const isEmptyOrZero =
      v === "" || v === null || typeof v === "undefined" || Number(v) === 0;
    if (isEmptyOrZero) {
      toast({
        title: "Cannot lock",
        description: `Cannot lock A${idx + 1} because value is empty or zero.`,
        status: "warning",
      });
      return;
    }

    setLockedApprovers((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  // Consider a value "filled" if:
  // - it is a non-empty string (text), OR
  // - it is numeric and > 0
  const isMeaningfulValue = (v) => {
    if (v === null || typeof v === "undefined") return false;
    const s = String(v).trim();
    if (s === "") return false;
    // if non-numeric text (remarks), treat as meaningful
    const n = Number(s);
    if (isNaN(n)) return true;
    return n > 0;
  };

  // helper: consider a field "filled" only if it is NOT empty and not zero
  const hasApproverValue = (key) => {
    const v = negotiation?.[key];
    if (v === null || typeof v === "undefined") return false;
    // treat empty string as empty
    if (String(v).trim() === "") return false;
    // treat zero (0 or "0") as empty for locking purposes
    const n = Number(v);
    if (!isNaN(n) && n === 0) return false;
    // otherwise it's a meaningful non-zero value
    return true;
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

  useEffect(() => {
    if (!inquiry?.id || !item?.id) return;

    const fetchNegotiation = async () => {
      try {
        const url = `${API_BASE}/api/inquiryRoutes/getNegotiation/${
          inquiry.id
        }/${getPaddedPosnr(item.id)}`;
        const resp = await axios.get(url);

        // resp.data might be the object itself OR wrapped like { status:'ok', data: { ... } }
        const raw = resp?.data;
        const sapRow = raw && raw.data ? raw.data : raw;

        if (!sapRow) {
          console.warn("No negotiation row in response", resp.data);
          return;
        }

        // Map SAP fields to strings for controlled inputs (so inputs don't flip between number/undefined)
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
        // Auto-lock approvers that have meaningful values (number > 0 or non-empty text)
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

  const handleNegotiationChange = (key, value) => {
    setNegotiation((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // remove the setTimeout autofocus here
  const handleApproverChange = (idx, val) => {
    const aKey = `A${idx + 1}_QTY`;
    const aUserKey = `A${idx + 1}_UNAME`;

    setNegotiation((prev) => {
      const next = { ...prev, [aKey]: val };
      // set approver username only when value provided & not already set
      if (val) next[aUserKey] = prev[aUserKey] || currentUserName;
      return next;
    });

    // DO NOT auto-focus here — keep input editable until user intentionally moves (Enter/Blur)
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

  // returns { ok: boolean, message?:string, rows: {index: message|null} }
  const validateSequentialApprovers = () => {
    const rowErrors = {};
    // detect gaps: if A2 set and A1 empty -> error; same for A3/A2
    for (let i = 2; i <= 3; i++) {
      const aKey = `A${i}_QTY`;
      const prevKey = `A${i - 1}_QTY`;
      if (negotiation[aKey] && !negotiation[prevKey]) {
        rowErrors[i - 1] = `Fill A${i - 1} before A${i}.`;
      }
    }
    // ensure at least one approver exists for Approve action
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

    // For Approve: ensure at least one approver filled
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

  // validation object used in render to show row errors
  const validation = validateSequentialApprovers();

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
    <Flex minH="100vh" bg={pageBg} justify="center" p={0}>
      <Box w="100%" maxW="100%" bg={cardBg} rounded="2xl" shadow="xl" p={6}>
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

        <Heading size="sm" mb={3} color={textColor}>
          Negotiation Table
        </Heading>

        <Table size="sm" variant="striped" colorScheme="gray" mb={6}>
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
                validation.rowErrors?.[rIdx + 1] ??
                validation.rowErrors?.[stage];
              // Note: validation.rowErrors keys correspond to stage indexes in this implementation
              return (
                <Tr key={stage}>
                  <Td>{`Stage ${stage}`}</Td>

                  {/* Seller rate (C#) - editable independently */}
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
                      // seller rate should NOT be locked by approver locks:
                      disabled={
                        isApproverDisabled(rIdx) || lockedApprovers[rIdx]
                      }
                      border="1px solid"
                      borderColor="gray.200"
                      rounded="md"
                      px={2}
                      py={1}
                    />
                  </Td>

                  {/* Approver rate (A#) */}
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
                          isApproverDisabled(rIdx) || lockedApprovers[rIdx]
                        }
                        border="1px solid"
                        borderColor={rowError ? "red.300" : "gray.200"}
                        rounded="md"
                        px={2}
                        py={1}
                      />
                      {rowError && (
                        <FormErrorMessage>{rowError}</FormErrorMessage>
                      )}
                    </FormControl>
                  </Td>

                  {/* Approver name (read-only) */}
                  <Td>
                    <Text>{negotiation[aUserKey] || "-"}</Text>
                  </Td>

                  {/* Remarks */}
                  <Td>
                    <Input
                      value={negotiation[rKey] ?? ""}
                      onChange={(e) =>
                        handleNegotiationChange(rKey, e.target.value)
                      }
                      // Remarks locked when approver is locked
                      disabled={lockedApprovers[rIdx]}
                      border="1px solid"
                      borderColor="gray.200"
                      rounded="md"
                      px={2}
                      py={1}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

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
              // disable Approve if sequential validation fails or no approver entered
              isDisabled={!validation.ok || !validation.anyApproverFilled}
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

      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        action={action}
        onConfirm={handleAction}
      />
    </Flex>
  );
}
