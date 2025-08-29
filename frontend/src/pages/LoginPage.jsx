import React, { useState } from "react";
import {
  Box,
  Flex,
  Heading,
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
} from "@chakra-ui/react";
import { EmailIcon, LockIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/inquiries");
  };

  // 🎨 Light/Dark values
  const pageBg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const logoBg = useColorModeValue("white", "white");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.300", "gray.600");
  const focusBlue = "#1E3C7B";
  const focusRed = "#7B1E1E";

  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg}>
      <Box
        w="100%"
        maxW="380px"
        rounded="2xl"
        shadow="lg"
        overflow="hidden"
        bg={cardBg}
      >
        {/* Curved Header with logo + wave */}
        <Box
          position="relative"
          h="200px"
          bgGradient="linear(to-r, #1E3C7B, #7B1E1E)"
        >
          <Flex justify="center" align="center" h="100%" pb="40px">
            <Box
              bg={logoBg}
              rounded="full"
              p={3}
              shadow="md"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Image src="/dnh_logo.png" alt="DNH Logo" boxSize="60px" />
            </Box>
          </Flex>

          {/* Wave cutout */}
          <Box position="absolute" bottom="0" w="100%" overflow="hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 150"
              preserveAspectRatio="none"
              style={{ display: "block", width: "100%", height: "80px" }}
            >
              <path
                d="M0.00,49.98 C150.00,150.00 350.00,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
                style={{ fill: useColorModeValue("white", "#1a202c") }} // 👈 wave matches bg
              ></path>
            </svg>
          </Box>
        </Box>

        {/* Form Section */}
        <Box p={8} pt={2}>
          <Heading as="h2" size="lg" mb={2} color={textColor}>
            Sign in
          </Heading>
          <Box w="50px" h="3px" bg={focusRed} mb={6} />

          <form onSubmit={handleLogin}>
            <VStack spacing={6} align="stretch">
              {/* Email */}
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
                    borderBottom="2px solid"
                    borderColor={borderColor}
                    _focus={{ borderColor: focusBlue }}
                    color={textColor}
                  />
                </InputGroup>
              </FormControl>

              {/* Password */}
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
                    borderBottom="2px solid"
                    borderColor={borderColor}
                    _focus={{ borderColor: focusRed }}
                    color={textColor}
                  />
                </InputGroup>
              </FormControl>

              {/* Remember me + Forgot password */}
              <HStack justify="space-between" fontSize="sm">
                <Checkbox
                  isChecked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  colorScheme="red"
                  color={subText}
                >
                  Remember Me
                </Checkbox>
                <Link color={focusRed} fontWeight="semibold">
                  Forgot Password?
                </Link>
              </HStack>

              {/* Login Button */}
              <Button
                type="submit"
                bg={focusRed}
                color="white"
                _hover={{ bg: "#5a1515" }}
                size="lg"
                rounded="md"
                w="100%"
              >
                Login
              </Button>
            </VStack>
          </form>
        </Box>
      </Box>
    </Flex>
  );
}
