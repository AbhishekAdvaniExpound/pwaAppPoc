// InquiryListPage.js
import {
  Box,
  Flex,
  Heading,
  VStack,
  Text,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";

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

export default function InquiryListPage() {
  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={6}>
      <Box bg="white" rounded="2xl" shadow="xl" p={6} w="100%" maxW="500px">
        {/* Title */}
        <Heading
          size="lg"
          mb={6}
          textAlign="center"
          bgGradient="linear(to-r, #1E3C7B, #7B1E1E)"
          bgClip="text"
        >
          List of Pending Inquiries
        </Heading>

        {/* Inquiry Cards */}
        <VStack spacing={4} align="stretch">
          {inquiries.map((inq, index) => (
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
    </Flex>
  );
}
