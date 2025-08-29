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

export default function NegotiationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { inquiry, item } = state || {};

  // Theme colors
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.700", "gray.200");

  // Editable Approver rates
  const [approverRates, setApproverRates] = useState(
    Array(3).fill(item?.rate || 0)
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
    <Flex minH="100vh" bg={pageBg} justify="center" p={1}>
      <Box w="100%" maxW="100%" bg={cardBg} rounded="2xl" shadow="xl" p={6}>
        {/* 🔹 Breadcrumb */}
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

        {/* Table layout for rates */}
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
            w="full"
            isLoading={loading && action === "Save"}
            onClick={() => {
              setAction("Save");
              onOpen();
            }}
          >
            Save
          </Button>
          <HStack spacing={4} w="full">
            <Button
              colorScheme="green"
              w="full"
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
              w="full"
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

        {/* Back Button */}
        <Button onClick={() => navigate(-1)} variant="outline" w="full">
          Back to Inquiry
        </Button>
      </Box>

      {/* Confirmation Dialog (extracted into reusable ConfirmDialog) */}
      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        action={action}
        onConfirm={handleAction}
      />
    </Flex>
  );
}
