// InquiryDetailPage.js
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
} from "@chakra-ui/react";
import {
  StarIcon,
  EditIcon,
  CheckCircleIcon,
  CloseIcon,
  DownloadIcon,
} from "@chakra-ui/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import ConfirmDialog from "../components/Shared/ConfirmDialog";

export default function InquiryDetailPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const inquiry = state?.inquiry;

  // Theme
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.700", "gray.200");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const toast = useToast();

  const openConfirm = (action, item = null) => {
    setAction(action);
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    console.log(` Confirmed: ${action}`);

    // 👉 Mock API integration point
    toast({
      title: "Action successful",
      description: `${action} completed.`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });

    if (action.includes("Negotiate") && selectedItem) {
      navigate("/NegotiationPage", { state: { inquiry, item: selectedItem } });
    }

    setIsDialogOpen(false);
  };

  if (!inquiry) {
    return (
      <Flex minH="100vh" bg={pageBg} align="center" justify="center">
        <Text fontSize="lg" color={textColor} mb={4}>
          No inquiry selected.
        </Text>
        <Button onClick={() => navigate("/inquiries")} colorScheme="blue">
          Back to List
        </Button>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg={pageBg} justify="center">
      <Box w="100%" maxW="100%" bg={cardBg} rounded="2xl" shadow="xl" p={6}>
        {/* 🔹 Breadcrumbs */}
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
              colorScheme="red" // 🔴 gives that PDF feel
              variant="solid"
              rounded="full" // ✅ makes it circular
              size="sm"
              shadow="md"
              _hover={{ transform: "scale(1.1)", shadow: "lg" }}
              _active={{ transform: "scale(0.95)" }}
            />
          </Tooltip>
        </Flex>

        {/* 🔹 Sticky Inquiry Header */}
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

        {/* 🔹 Item Grid Layout */}
        <Heading size="md" mb={4} color={textColor}>
          List of Items
        </Heading>
        {inquiry.items?.length ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {inquiry.items.map((item) => {
              const status = item.status || "Pending"; // mock status field
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
                  {/* 🔹 Status Badge */}
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

                  {/* 🔹 Action Buttons with Icons + Tooltip */}
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

        {/* Footer Actions */}
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

      {/* 🔹 Reusable Confirmation Dialog */}
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
