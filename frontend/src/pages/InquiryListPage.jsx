// InquiryListPage.js
import {
  Box,
  Flex,
  Heading,
  VStack,
  Text,
  HStack,
  Icon,
  Divider,
  Select,
  Input,
  Button,
  Badge,
  ButtonGroup,
  useColorMode,
  useColorModeValue,
  SimpleGrid,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import {
  StarIcon,
  Search2Icon,
  MoonIcon,
  SunIcon,
  WarningIcon,
  TimeIcon,
  CheckCircleIcon,
} from "@chakra-ui/icons";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

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
export default function InquiryListPage() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

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

  // 🌗 Dynamic colors
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textHeadingColor = useColorModeValue("black", "white");
  const subText = useColorModeValue("gray.600", "gray.400");

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
        <HStack justify="space-between">
          <Heading
            size="lg"
            bgClip="text"
            fontWeight="extrabold"
            color={textHeadingColor}
          >
            Pending Inquiries
          </Heading>
          <IconButton
            aria-label="Toggle theme"
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
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
        {paginatedInquiries.length > 0 ? (
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
          <Text fontSize="sm" color={subText}>
            Showing {startIndex + 1} –{" "}
            {Math.min(startIndex + pageSize, filteredInquiries.length)} of{" "}
            {filteredInquiries.length}
          </Text>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button onClick={() => setPage(1)} isDisabled={page === 1}>
              First
            </Button>
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            >
              Prev
            </Button>
            <Button colorScheme="blue">
              {page} / {totalPages}
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page === totalPages}
            >
              Next
            </Button>
            <Button
              onClick={() => setPage(totalPages)}
              isDisabled={page === totalPages}
            >
              Last
            </Button>
          </ButtonGroup>
        </HStack>
      )}

      <Divider my={4} borderColor={borderColor} />
      <Text fontSize="xs" textAlign="center" color={subText} pb={4}>
        Inquiry list powered by DNH API
      </Text>
    </Flex>
  );
}
