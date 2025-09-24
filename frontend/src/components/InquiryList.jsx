// InquiryDetailPage.js
import React, { useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  VStack,
  Text,
  HStack,
  Icon,
  Button,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Badge,
  useToast,
  Spacer,
} from "@chakra-ui/react";
import { StarIcon, RepeatIcon } from "@chakra-ui/icons";
import { useInquiries } from "./InquiryContext"; // adjust path if needed

const inquiries = [
  {
    id: "Inq-01",
    qty: 10,
    customer: "Customer Name (40)",
    broker: "Broker Name (40)",
    sales: "Sales Person (40)",
  },
  {
    id: "Inq-03",
    qty: 10,
    customer: "Customer Name (40)",
    broker: "Broker Name (40)",
    sales: "Sales Person (40)",
  },
  {
    id: "Inq-04",
    qty: 10,
    customer: "Customer Name (40)",
    sales: "Sales Person (40)",
  },
  {
    id: "Inq-05",
    qty: 10,
    customer: "Customer Name (40)",
    sales: "Sales Person (40)",
  },
  {
    id: "Inq-06",
    qty: 10,
    customer: "Customer Name (40)",
    sales: "Sales Person (40)",
  },
  {
    id: "Inq-07",
    qty: 10,
    customer: "Customer Name (40)",
    sales: "Sales Person (40)",
  },
];

export default function InquiryDetailPage() {
  const {
    inquiries: ctxInquiries,
    loading,
    error,
    usingMock,
    refreshFromApi,
    applyMockFallback,
  } = useInquiries();

  const {
    isOpen: isErrorOpen,
    onOpen: onErrorOpen,
    onClose: onErrorClose,
  } = useDisclosure();

  const toast = useToast();

  // Open modal when an error appears and not already using mock
  useEffect(() => {
    if (error && !usingMock) {
      onErrorOpen();
    }
  }, [error, usingMock, onErrorOpen]);

  const handleRefresh = async () => {
    const ok = await refreshFromApi();
    if (ok) {
      toast({
        title: "Refreshed",
        description: "Loaded data from API.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Refresh failed",
        description: "Could not load data from API. Still using current data.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleShowMocks = () => {
    applyMockFallback();
    onErrorClose();
    toast({
      title: "Using mock entries",
      description: "Local mock data enabled until API is available.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // decide which list to display: API/context list if available, otherwise keep the original static array
  const displayList =
    Array.isArray(ctxInquiries) && ctxInquiries.length > 0
      ? ctxInquiries
      : inquiries;

  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={0}>
      <Box bg="white" rounded="2xl" shadow="xl" p={6} w="100%" maxW="760px">
        {/* Title row with Refresh and mock-badge */}
        <Flex align="center" mb={4} gap={3}>
          <Heading
            size="lg"
            textAlign="center"
            bgGradient="linear(to-r, #1E3C7B, #7B1E1E)"
            bgClip="text"
          >
            List of Pending Inquiries
          </Heading>

          <Spacer />

          {usingMock && (
            <Badge colorScheme="orange" mr={2}>
              Using mock data
            </Badge>
          )}

          <HStack spacing={2}>
            <Button
              leftIcon={<RepeatIcon />}
              onClick={handleRefresh}
              isLoading={loading}
              loadingText="Refreshing"
              size="sm"
              variant="outline"
            ></Button>
          </HStack>
        </Flex>

        {/* Inquiry Cards */}
        <VStack spacing={4} align="stretch">
          {displayList.map((inq, index) => (
            <Box
              key={inq.id}
              p={4}
              rounded="lg"
              shadow="sm"
              border="1px solid"
              borderColor="gray.200"
              _hover={{ shadow: "md", transform: "scale(1.02)" }}
              transition="0.2s"
              bg="white"
            >
              <HStack spacing={3} mb={2}>
                <Icon
                  as={StarIcon}
                  color={index % 2 === 0 ? "#1E3C7B" : "#7B1E1E"}
                />
                <Text fontWeight="bold" color="gray.800">
                  {inq.id} ({inq.qty}) - {inq.customer}
                </Text>
              </HStack>
              {inq.broker && (
                <Text fontSize="sm" color="gray.600">
                  {inq.broker}
                </Text>
              )}
              <Text fontSize="sm" color="gray.600">
                {inq.sales}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Error modal: ask whether to show mock entries */}
      <Modal isOpen={isErrorOpen} onClose={onErrorClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Failed to load data</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={2}>There was an error fetching data from the API.</Text>
            {error?.status && (
              <Text fontSize="sm" color="gray.500" mb={2}>
                Error {error.status} — {error.message}
              </Text>
            )}
            <Text fontSize="sm" color="gray.600">
              You can continue with local mock entries, or try refreshing to
              attempt loading API data again.
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onErrorClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onErrorClose();
                handleRefresh();
              }}
              mr={3}
            >
              Try Refresh
            </Button>
            <Button colorScheme="blue" onClick={handleShowMocks}>
              Show Mock Entries
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
