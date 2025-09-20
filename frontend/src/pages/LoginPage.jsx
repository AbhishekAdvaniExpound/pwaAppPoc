// LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  Checkbox,
  VStack,
  HStack,
  Link,
  InputGroup,
  InputLeftElement,
  Image,
  useColorModeValue,
  IconButton,
  useColorMode,
  useBreakpointValue,
} from "@chakra-ui/react";
import { EmailIcon, LockIcon, SunIcon, MoonIcon } from "@chakra-ui/icons";
import { motion, useAnimation } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useInquiries } from "../context/InquiryContext";
import HeroSectionLoginPage from "./HeroSectionLoginPage";
import { useNavigate } from "react-router-dom";

const MotionBox = motion(Box);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { inquiries, fetchInquiries } = useInquiries();

  // new: submission state for loader
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    // persist inquiries as before (kept behavior)
    localStorage.setItem("selectedInquiry", JSON.stringify(inquiries));

    setIsSubmitting(true);
    try {
      // wait for login to finish so loader shows till response arrives
      await login(username, password);
      // if you want to navigate after successful login, uncomment:
      navigate("/inquiries");
    } catch (err) {
      // optionally surface error to user via toast / set state
      console.error("Login error:", err);
      navigate("/inquiries");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { colorMode, toggleColorMode } = useColorMode();

  // ---------------------------
  // ALL hooks / derived values
  // ---------------------------
  const pageBg = useColorModeValue("white", "rgba(2,6,23,0.72)");
  const geoPrimary = useColorModeValue("#2563EB", "#60A5FA");
  const geoAccent = useColorModeValue("#F59E0B", "#FBBF24");
  const cardBg = useColorModeValue("white", "rgba(2,6,23,0.72)");
  const logoBg = useColorModeValue("white", "white");

  const textColor = useColorModeValue("gray.800", "gray.100");
  const headingColor = useColorModeValue("gray.800", "white");
  const subText = useColorModeValue("gray.600", "gray.400");

  const inputBg = useColorModeValue("gray.50", "transparent");
  const inputBorder = useColorModeValue("gray.200", "gray.700");
  const borderColor = inputBorder;

  const headerHoverBg = useColorModeValue("gray.100", "gray.700");
  const svgFill = useColorModeValue("white", "#0B1220");
  const cardOverlay = useColorModeValue(
    "rgba(255,255,255,0.02)",
    "rgba(2,6,23,0.45)"
  );

  const focusBlue = "#1E3C7B";
  const focusRed = "#7B1E1E";

  const isMobile = useBreakpointValue({ base: true, md: false });

  const controls = useAnimation();
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  useEffect(() => {
    const setHeight = () => {
      setVh(window.innerHeight);
    };
    setHeight();
    fetchInquiries();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, [fetchInquiries]);

  const [revealed, setRevealed] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!isMobile) {
      controls.set({ y: 0 });
      fetchInquiries();
      setRevealed(true);
    } else {
      controls.set({ y: 0 });
      setRevealed(false);
    }
  }, [isMobile, vh, controls, fetchInquiries]);

  /* ---------- replace handleParentDragEnd with this improved version ---------- */
  const handleParentDragEnd = (_, info) => {
    const { offset, velocity } = info;
    const dy = offset.y; // negative => up, positive => down
    const vy = velocity.y; // negative => up, positive => down

    // small dead-zone: ignore tiny accidental drags
    if (Math.abs(dy) < 24 && Math.abs(vy) < 250) {
      if (revealed) {
        controls.start({
          y: -vh,
          transition: { type: "spring", stiffness: 600, damping: 40 },
        });
      } else {
        controls.start({
          y: 0,
          transition: { type: "spring", stiffness: 600, damping: 40 },
        });
      }
      return;
    }

    // easier-to-hit thresholds on mobile
    const upDistanceThreshold = -vh * 0.18; // smaller so swipe-up is easier
    const downDistanceThreshold = vh * 0.15;
    const upVelocityThreshold = -700; // fast upward swipe
    const downVelocityThreshold = 700; // fast downward swipe

    // stop any running animations to avoid races
    try {
      controls.stop();
    } catch (e) {
      /* ignore if stop() not supported in some versions */
    }

    if (dy <= upDistanceThreshold || vy <= upVelocityThreshold) {
      // reveal (slide up)
      controls.start({
        y: -vh,
        transition: { type: "spring", stiffness: 600, damping: 40 },
      });
      setRevealed(true);
      return;
    }

    if (dy >= downDistanceThreshold || vy >= downVelocityThreshold) {
      // hide (slide down)
      controls.start({
        y: 0,
        transition: { type: "spring", stiffness: 600, damping: 40 },
      });
      setRevealed(false);
      return;
    }

    // otherwise return to nearest stable state
    if (revealed) {
      controls.start({
        y: -vh,
        transition: { type: "spring", stiffness: 600, damping: 40 },
      });
    } else {
      controls.start({
        y: 0,
        transition: { type: "spring", stiffness: 600, damping: 40 },
      });
    }
  };

  const sharedHeroBg =
    "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.9) 0px, transparent 45%), radial-gradient(circle at 70% 60%, rgba(147,51,234,0.8) 0px, transparent 45%), radial-gradient(circle at 40% 80%, rgba(123,30,30,0.8) 0px, transparent 45%)";

  // ---------- Render ----------
  if (isMobile) {
    return (
      <Box h="100vh" w="100%" bg={pageBg} overflow="hidden" position="relative">
        <MotionBox
          initial={{ y: 0 }}
          animate={controls}
          style={{ touchAction: "none" }} // allow pan/drag on touch
          height={vh * 2}
          width="100%"
          drag="y"
          dragConstraints={{ top: -vh, bottom: 0 }}
          dragElastic={0} // <-- no elastic bounce
          dragMomentum={false} // <-- disable momentum/inertia after release
          onDragEnd={handleParentDragEnd}
        >
          <Box
            ref={heroRef}
            height={vh}
            width="100%"
            bgImage={sharedHeroBg}
            bgColor="#0F172A"
            color="white"
            px={6}
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <HeroSectionLoginPage />
            <Box
              position="absolute"
              bottom="18px"
              left="50%"
              transform="translateX(-50%)"
            >
              <Box
                w="44px"
                h="6px"
                bg="rgba(255,255,255,0.12)"
                borderRadius="999px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  w="18px"
                  h="4px"
                  bg="rgba(255,255,255,0.28)"
                  borderRadius="999px"
                />
              </Box>
              <Text mt={2} fontSize="xs" opacity={0.85} textAlign="center">
                Swipe up
              </Text>
            </Box>
          </Box>

          <Box
            height={vh}
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            bgImage={sharedHeroBg}
            bgColor="#0F172A"
          >
            <Box
              w="100%"
              maxW="420px"
              rounded="2xl"
              shadow="lg"
              overflow="hidden"
              bg={cardBg}
              position="relative"
              boxSizing="border-box"
            >
              <Box position="absolute" inset={0} bg={cardOverlay} zIndex={0} />

              <Box
                position="relative"
                h="200px"
                bgGradient="linear(to-r, #1E3C7B, #7B1E1E)"
                zIndex={1}
              >
                <Box position="absolute" top="3" right="3" zIndex={2}>
                  <IconButton
                    aria-label={`Switch to ${
                      colorMode === "light" ? "dark" : "light"
                    } mode`}
                    onClick={toggleColorMode}
                    size="sm"
                    rounded="full"
                    variant="ghost"
                    _hover={{ bg: headerHoverBg }}
                    icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                  />
                </Box>

                <Flex justify="center" align="center" h="100%" pb="28px">
                  <Box
                    bg={logoBg}
                    rounded="full"
                    p={3}
                    shadow="md"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    zIndex={2}
                  >
                    <Image src="/dnh_logo.png" alt="DNH Logo" boxSize="56px" />
                  </Box>
                </Flex>

                <Box
                  position="absolute"
                  bottom="0"
                  w="100%"
                  overflow="hidden"
                  h="60px"
                  zIndex={1}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 500 150"
                    preserveAspectRatio="none"
                    width="100%"
                    height="100%"
                    style={{ display: "block" }}
                  >
                    <path
                      d="M0.00,49.98 C150.00,150.00 350.00,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
                      style={{ fill: svgFill }}
                    />
                  </svg>
                </Box>
              </Box>

              <Box
                p={{ base: 6, md: 8 }}
                pt={{ base: 4, md: 2 }}
                position="relative"
                zIndex={2}
              >
                <Heading
                  as="h2"
                  fontSize={{ base: "lg", md: "xl" }}
                  mb={2}
                  color={headingColor}
                  textAlign="center"
                >
                  Sign in
                </Heading>
                <Box w="50px" h="3px" bg={focusRed} mx="auto" mb={6} />

                <form onSubmit={handleLogin}>
                  <VStack spacing={6} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm" color={subText}>
                        Email
                      </FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <EmailIcon color="gray.400" />
                        </InputLeftElement>
                        <Input
                          placeholder="demo@email.com"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          variant="flushed"
                          bg={inputBg}
                          borderBottom="2px solid"
                          borderColor={borderColor}
                          _focus={{ borderColor: focusBlue }}
                          color={textColor}
                          size="md"
                          py={3}
                          shadow="lg"
                          isDisabled={isSubmitting}
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" color={subText}>
                        Password
                      </FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <LockIcon color="gray.400" />
                        </InputLeftElement>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          variant="flushed"
                          bg={inputBg}
                          borderBottom="2px solid"
                          borderColor={borderColor}
                          _focus={{ borderColor: focusRed }}
                          color={textColor}
                          size="md"
                          py={3}
                          shadow="lg"
                          isDisabled={isSubmitting}
                        />
                      </InputGroup>
                    </FormControl>

                    <HStack justify="space-between" fontSize="sm">
                      <Checkbox
                        isChecked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        colorScheme="red"
                        color={subText}
                        isDisabled={isSubmitting}
                      >
                        Remember Me
                      </Checkbox>
                      <Link color={focusRed} fontWeight="semibold">
                        Forgot Password?
                      </Link>
                    </HStack>

                    <Button
                      type="submit"
                      bg={focusRed}
                      color="white"
                      _hover={{ bg: "#5a1515" }}
                      size="lg"
                      rounded="md"
                      w="100%"
                      isLoading={isSubmitting}
                      loadingText="Signing in..."
                    >
                      Login
                    </Button>
                  </VStack>
                </form>
              </Box>
            </Box>
          </Box>
        </MotionBox>
      </Box>
    );
  }

  // ---------- Desktop / Tablet layout ----------
  return (
    <Flex
      h="100vh"
      w="100%"
      bg="black"
      overflow="hidden"
      boxSizing="border-box"
    >
      <Flex
        w="100%"
        h="100%"
        direction={{ base: "column", md: "row" }}
        align="stretch"
      >
        <Box
          flex={{ base: "1", md: "1", lg: "0 0 60%" }}
          w={{ base: "100%", md: "auto", lg: "60%" }}
          display={{ base: "none", md: "flex" }}
          alignItems="center"
          justifyContent="center"
          bgImage={sharedHeroBg}
          bgColor="#0F172A"
          color="white"
          px={{ base: 6, md: 12 }}
          h="100%"
          boxSizing="border-box"
          overflow="hidden"
        >
          <HeroSectionLoginPage />
        </Box>

        <Flex
          flex={{ base: "none", md: "0 0 420px", lg: "0 0 40%" }}
          w={{ base: "100%", md: "420px", lg: "40%" }}
          align="center"
          justify="center"
          px={{ base: 4, md: 8 }}
          h="100%"
          boxSizing="border-box"
          bgColor={pageBg}
        >
          <Box position="absolute" inset={0} zIndex={0} pointerEvents="none">
            <svg width="100%" height="100%">
              <circle
                cx="20%"
                cy="30%"
                r="180"
                fill={geoPrimary}
                opacity="0.15"
              />
              <rect
                x="70%"
                y="10%"
                width="200"
                height="200"
                rx="32"
                fill={geoAccent}
                opacity="0.08"
              />
            </svg>
          </Box>

          <Box
            w="100%"
            maxW="420px"
            rounded="2xl"
            shadow="lg"
            overflow="hidden"
            bg={cardBg}
            position="relative"
            boxSizing="border-box"
          >
            <Box position="absolute" inset={0} bg={cardOverlay} zIndex={0} />

            <Box
              position="relative"
              h={{ base: "200px", md: "200px" }}
              bgGradient="linear(to-r, #1E3C7B, #7B1E1E)"
              zIndex={1}
            >
              <Box position="absolute" top="3" right="3" zIndex={2}>
                <IconButton
                  aria-label={`Switch to ${
                    colorMode === "light" ? "dark" : "light"
                  } mode`}
                  onClick={toggleColorMode}
                  size="sm"
                  rounded="full"
                  variant="ghost"
                  _hover={{ bg: headerHoverBg }}
                  icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                />
              </Box>

              <Flex justify="center" align="center" h="100%" pb="28px">
                <Box
                  bg={logoBg}
                  rounded="full"
                  p={3}
                  shadow="md"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  zIndex={2}
                >
                  <Image src="/dnh_logo.png" alt="DNH Logo" boxSize="56px" />
                </Box>
              </Flex>

              <Box
                position="absolute"
                bottom="0"
                w="100%"
                overflow="hidden"
                h="60px"
                zIndex={1}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 150"
                  preserveAspectRatio="none"
                  width="100%"
                  height="100%"
                  style={{ display: "block" }}
                >
                  <path
                    d="M0.00,49.98 C150.00,150.00 350.00,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
                    style={{ fill: svgFill }}
                  />
                </svg>
              </Box>
            </Box>

            <Box
              p={{ base: 6, md: 8 }}
              pt={{ base: 4, md: 2 }}
              position="relative"
              zIndex={2}
            >
              <Heading
                as="h2"
                fontSize={{ base: "lg", md: "xl" }}
                mb={2}
                color={headingColor}
                textAlign="center"
              >
                Sign in
              </Heading>
              <Box w="50px" h="3px" bg={focusRed} mx="auto" mb={6} />

              <form onSubmit={handleLogin}>
                <VStack spacing={6} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm" color={subText}>
                      Email
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <EmailIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="demo@email.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        variant="flushed"
                        bg={inputBg}
                        borderBottom="2px solid"
                        borderColor={borderColor}
                        _focus={{ borderColor: focusBlue }}
                        color={textColor}
                        size="md"
                        py={3}
                        isDisabled={isSubmitting}
                      />
                    </InputGroup>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" color={subText}>
                      Password
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <LockIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        variant="flushed"
                        bg={inputBg}
                        borderBottom="2px solid"
                        borderColor={borderColor}
                        _focus={{ borderColor: focusRed }}
                        color={textColor}
                        size="md"
                        py={3}
                        isDisabled={isSubmitting}
                      />
                    </InputGroup>
                  </FormControl>

                  <HStack justify="space-between" fontSize="sm">
                    <Checkbox
                      isChecked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      colorScheme="red"
                      color={subText}
                      isDisabled={isSubmitting}
                    >
                      Remember Me
                    </Checkbox>
                    <Link color={focusRed} fontWeight="semibold">
                      Forgot Password?
                    </Link>
                  </HStack>

                  <Button
                    type="submit"
                    bg={focusRed}
                    color="white"
                    _hover={{ bg: "#5a1515" }}
                    size="lg"
                    rounded="md"
                    w="100%"
                    isLoading={isSubmitting}
                    loadingText="Signing in..."
                  >
                    Login
                  </Button>
                </VStack>
              </form>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}
