import React from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Image,
  VStack,
  Stack,
  Button,
  useColorModeValue,
  Badge,
  VisuallyHidden,
  chakra,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(chakra.div);
const MotionVStack = motion(VStack);

export default function HeroSectionLoginPage({
  title = "Welcome to DNH Spinners",
  subtitle = "Manage customer inquiries, track progress and close deals faster. Built for teams who want speed + simplicity.",
  imageSrc = "/cheerful-man-got-approval-illustration.jpg",
  ctaText = "Get Started",
  secondaryCta = "Learn More",
}) {
  const logoBg = useColorModeValue("gray.100", "gray.700");
  const headingSize = { base: "lg", md: "3xl" };

  // Motion variants for text column (staggered children)
  const textVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.12,
        delayChildren: 0.08,
      },
    },
  };
  const childVariant = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  };

  return (
    <Box as="section" w="100%" px={{ base: 4, md: 6 }} py={{ base: 6, md: 12 }}>
      <Flex
        maxW="1000px"
        mx="auto"
        align="center"
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={{ base: 6, md: 12 }}
      >
        {/* Left: Text column (animated) */}
        <MotionVStack
          align="flex-start"
          spacing={{ base: 3, md: 6 }}
          maxW={{ base: "100%", md: "560px" }}
          initial="hidden"
          animate="visible"
          variants={textVariants}
        >
          <MotionBox variants={childVariant}>
            <Badge
              bg={logoBg}
              rounded="full"
              px={3}
              py={1}
              fontWeight="semibold"
              colorScheme="green"
            >
              New
            </Badge>
          </MotionBox>

          <MotionBox variants={childVariant}>
            <Heading as="h1" size={headingSize} lineHeight="short">
              {title}
            </Heading>
          </MotionBox>

          <MotionBox variants={childVariant}>
            <Text fontSize={{ base: "14px", md: "16px" }} opacity={0.9}>
              {subtitle}
            </Text>
          </MotionBox>

          <MotionBox variants={childVariant} pt={2}>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Button size="md" colorScheme="teal">
                {ctaText}
              </Button>
              <Button variant="ghost" size="md">
                {secondaryCta}
              </Button>
            </Stack>
          </MotionBox>
        </MotionVStack>

        {/* Right: Illustration column */}
        <Box
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          minW={{ base: "48%", md: "220px" }}
          maxW={{ base: "100%", md: "320px" }}
        >
          <MotionBox
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            aria-hidden={false}
            role="img"
          >
            <VisuallyHidden>
              Illustration: cheerful person celebrating approval
            </VisuallyHidden>
            <Image
              src={imageSrc}
              alt="Person celebrating approval"
              width={{ base: "200px", md: "360px" }}
              maxW="100%"
              objectFit="contain"
              loading="lazy"
              fallbackSrc="/placeholder-illustration.png"
              draggable={false}
              opacity={0.8}
            />
          </MotionBox>
        </Box>
      </Flex>
    </Box>
  );
}
