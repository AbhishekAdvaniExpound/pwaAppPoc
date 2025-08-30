import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Badge,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Kbd,
  Link,
  Spacer,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useToast,
  VStack,
  Divider,
  Code,
} from "@chakra-ui/react";
import {
  CheckCircle,
  Bell,
  BellOff,
  Cloud,
  Download,
  Link as LinkIcon,
  Moon,
  Sun,
  Repeat,
  Info,
} from "react-feather";
import { API_BASE } from "./api/authApi";

const PUBLIC_VAPID_KEY =
  "BMCht6yT0qJktTK-G1eFC56nKbrohESdcx3lpXtvsbU4qDABvciqIbFXG4F40r4fP6ilU94Q3L6qADyQH1Cdmj4";

//  Set API base from environment variable (fallback to Render)

// https://pwaapppoc.onrender.com
// --- helpers ---
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function NotificationPage() {
  const toast = useToast();
  // const toast = useToast();

  const { colorMode, toggleColorMode } = useColorMode();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState(
    Notification?.permission ?? "default"
  );
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subCount, setSubCount] = useState(null);
  const regRef = useRef(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const subtle = useColorModeValue("gray.600", "gray.300");
  const ring = useColorModeValue("gray.200", "whiteAlpha.300");

  const canInstall = Boolean(installPromptEvent);

  const pushStatus = useMemo(() => {
    if (!isSupported) return { label: "Unsupported", colorScheme: "red" };
    if (permission === "denied")
      return { label: "Blocked", colorScheme: "red" };
    if (!isSubscribed)
      return { label: "Not Subscribed", colorScheme: "orange" };
    return { label: "Subscribed", colorScheme: "green" };
  }, [isSupported, permission, isSubscribed]);

  // --- effects ---
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    // register service worker
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        regRef.current = reg;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));
      } catch (err) {
        console.error("Service Worker Error:", err);
        toast({
          title: "Service worker registration failed",
          description: String(err?.message || err),
          status: "error",
        });
      }
    })();

    // listen permission changes (Chrome supports onchange)
    try {
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: "notifications" }).then((perm) => {
          setPermission(perm.state);
          perm.onchange = () => setPermission(perm.state);
        });
      } else {
        setPermission(Notification?.permission ?? "default");
      }
    } catch {
      /* noop */
    }

    // capture install prompt
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch sub count (optional admin insight)
  const refreshSubscriptionCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/push/getAllSubscriptions`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSubCount(json?.count ?? 0);
    } catch {
      setSubCount(null); // hide if not available
    }
  };

  useEffect(() => {
    refreshSubscriptionCount();
    const id = setInterval(refreshSubscriptionCount, 15_000);
    return () => clearInterval(id);
  }, []);

  // --- actions ---
  const subscribeUser = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const reg =
        regRef.current || (await navigator.serviceWorker.register("/sw.js"));

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        toast({ title: "Already subscribed", status: "info" });
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const res = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok)
        throw new Error(
          `Subscribe failed: ${res.status} - ${await res.text()}`
        );

      setIsSubscribed(true);
      setLogLines((l) => [
        ` Subscription saved @ ${new Date().toLocaleTimeString()}`,
        ...l,
      ]);
      toast({ title: "Subscribed to push", status: "success" });
      refreshSubscriptionCount();
    } catch (err) {
      console.error(err);
      toast({
        title: "Subscription failed",
        description: String(err?.message || err),
        status: "error",
      });
      setLogLines((l) => [
        ` Subscribe error: ${String(err?.message || err)}`,
        ...l,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const reg =
        regRef.current || (await navigator.serviceWorker.getRegistration());
      if (!reg) throw new Error("No service worker registration found");

      // 1) Unsubscribe push
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      setIsSubscribed(false);
      setLogLines((l) => [
        `🔕 Unsubscribed @ ${new Date().toLocaleTimeString()}`,
        ...l,
      ]);
      toast({ title: "Unsubscribed", status: "success" });

      // 2) Ask browser to check for an updated SW
      try {
        await reg.update();
      } catch {}

      // 3) Promote a new worker if present (waiting OR installing)
      const candidate = reg.waiting || reg.installing;
      if (candidate) {
        candidate.postMessage({ type: "SKIP_WAITING" });

        // Wait until the new SW takes control (with a timeout)
        await new Promise((resolve) => {
          let done = false;
          const onChange = () => {
            if (done) return;
            done = true;
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              onChange
            );
            resolve();
          };
          const t = setTimeout(() => {
            if (done) return;
            done = true;
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              onChange
            );
            resolve(); // continue anyway after timeout
          }, 3000);
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            clearTimeout(t);
            onChange();
          });
        });
      }

      await refreshSubscriptionCount();
      toast({
        title: "App updated",
        description: "Reloading…",
        status: "info",
      });
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      toast({
        title: "Unsubscribe failed",
        description: String(err?.message || err),
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/push/notify`, {
        method: "POST",
        body: JSON.stringify({
          title: "Hello!",
          body: "This is a test push 🔔",
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok)
        throw new Error(`Server responded ${res.status}: ${await res.text()}`);
      const result = await res.json();

      if (result.success) {
        toast({ title: "Push sent", status: "success" });
        setLogLines((l) => [
          `📤 Push sent @ ${new Date().toLocaleTimeString()}`,
          ...l,
        ]);
      } else {
        toast({ title: "Push failed (server)", status: "warning" });
        setLogLines((l) => [`⚠️ Push failed on server`, ...l]);
      }
    } catch (err) {
      toast({
        title: "Push error",
        description: String(err?.message || err),
        status: "error",
      });
      setLogLines((l) => [
        ` Push send failed: ${String(err?.message || err)}`,
        ...l,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      toast({ title: "App installing…", status: "success" });
    } else {
      toast({ title: "Install dismissed", status: "info" });
    }
    setInstallPromptEvent(null);
  };

  // --- UI ---
  return (
    <Box minH="100dvh" bg={useColorModeValue("gray.50", "gray.900")}>
      {/* Top App Bar */}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bg={useColorModeValue("white", "gray.900")}
        borderBottom="1px solid"
        borderColor={ring}
      >
        <Container maxW="container.lg" py={3}>
          <HStack spacing={3}>
            <Icon as={BellOff} />
            <Heading size="md">Push PWA Dashboard</Heading>
            <Tag
              size="sm"
              colorScheme={pushStatus.colorScheme}
              borderRadius="full"
              ml={2}
            >
              <TagLabel>{pushStatus.label}</TagLabel>
            </Tag>
            <Spacer />
            <Tooltip label={`Theme: ${colorMode}`}>
              <IconButton
                aria-label="Toggle color mode"
                icon={<Icon as={colorMode === "light" ? Moon : Sun} />}
                onClick={toggleColorMode}
                variant="ghost"
                size="sm"
              />
            </Tooltip>
            <Tooltip label="API Base">
              <Tag size="sm" variant="subtle">
                <TagLabel>
                  <Icon
                    as={LinkIcon}
                    style={{ verticalAlign: "-2px", marginRight: 6 }}
                  />
                  {new URL(API_BASE).host}
                </TagLabel>
              </Tag>
            </Tooltip>
          </HStack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="container.lg" py={6}>
        <Grid
          templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "2fr 1fr" }}
          gap={6}
          alignItems="stretch"
        >
          {/* Left: Actions & Stats */}
          <GridItem>
            <Stack spacing={6}>
              <Box
                bg={cardBg}
                p={5}
                rounded="2xl"
                shadow="sm"
                border="1px solid"
                borderColor={ring}
              >
                <HStack mb={3} spacing={3}>
                  <Icon as={Cloud} />
                  <Heading size="sm">Push Controls</Heading>
                  <Spacer />
                  <Badge
                    colorScheme={
                      permission === "granted"
                        ? "green"
                        : permission === "denied"
                        ? "red"
                        : "orange"
                    }
                  >
                    Permission: {permission}
                  </Badge>
                </HStack>

                <Text color={subtle} mb={4}>
                  Manage device subscription and send a test push. Install to
                  your home screen for a native feel.
                </Text>

                <HStack spacing={3} wrap="wrap">
                  <Button
                    leftIcon={<Icon as={Bell} />}
                    colorScheme="blue"
                    onClick={subscribeUser}
                    isDisabled={
                      !isSupported || isSubscribed || permission === "denied"
                    }
                    isLoading={loading}
                  >
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </Button>

                  <Button
                    leftIcon={<Icon as={BellOff} />}
                    onClick={sendNotification}
                    isDisabled={!isSubscribed || !isSupported}
                    isLoading={loading}
                  >
                    Send Test Notification
                  </Button>

                  <Button
                    variant="outline"
                    onClick={unsubscribeUser}
                    isDisabled={!isSubscribed || loading}
                  >
                    Unsubscribe
                  </Button>

                  <Tooltip label="Install as an app (PWA)">
                    <Button
                      leftIcon={<Icon as={Download} />}
                      variant="ghost"
                      onClick={handleInstall}
                      isDisabled={!canInstall}
                    >
                      Install App
                    </Button>
                  </Tooltip>
                </HStack>

                <Divider my={4} />

                <HStack spacing={6} align="stretch">
                  <Stat>
                    <StatLabel>Device Status</StatLabel>
                    <StatNumber>
                      <HStack>
                        <Icon
                          as={CheckCircle}
                          color={isSubscribed ? "green.400" : "gray.400"}
                        />
                        <Text>{isSubscribed ? "Ready" : "Inactive"}</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText>Service Worker & Push</StatHelpText>
                  </Stat>

                  <Stat>
                    <StatLabel>Subscribers</StatLabel>
                    <StatNumber>{subCount ?? "—"}</StatNumber>
                    <StatHelpText>Across all devices</StatHelpText>
                  </Stat>
                </HStack>
              </Box>

              <Box
                bg={cardBg}
                p={5}
                rounded="2xl"
                shadow="sm"
                border="1px solid"
                borderColor={ring}
              >
                <HStack mb={3} spacing={3}>
                  <Icon as={Info} />
                  <Heading size="sm">Quick Tips</Heading>
                </HStack>
                <VStack align="start" spacing={2} color={subtle} fontSize="sm">
                  <Text>
                    • Ensure <Kbd>sw.js</Kbd> is at project root (served at{" "}
                    <Code>/sw.js</Code>).
                  </Text>
                  <Text> • Browser must be HTTPS (Render ).</Text>
                  <Text>
                    {" "}
                    • If permission is <Code>denied</Code>, clear site
                    permissions to retry.
                  </Text>
                </VStack>
              </Box>
            </Stack>
          </GridItem>

          {/* Right: Activity Log */}
          <GridItem>
            <Box
              bg={cardBg}
              p={5}
              rounded="2xl"
              shadow="sm"
              border="1px solid"
              borderColor={ring}
              h="100%"
              display="flex"
              flexDir="column"
            >
              <HStack mb={3} spacing={3}>
                <Icon as={Repeat} />
                <Heading size="sm">Activity</Heading>
                <Spacer />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLogLines([])}
                >
                  Clear
                </Button>
              </HStack>

              <Box
                flex="1"
                border="1px dashed"
                borderColor={ring}
                rounded="lg"
                p={3}
                bg={useColorModeValue("gray.50", "blackAlpha.300")}
                overflow="auto"
              >
                {logLines.length === 0 ? (
                  <Text color={subtle}>No recent activity…</Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {logLines.map((line, idx) => (
                      <Box key={idx} fontFamily="mono" fontSize="sm">
                        {line}
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>

              <Text mt={3} fontSize="xs" color={subtle}>
                API:{" "}
                <Link href={API_BASE} isExternal color="blue.400">
                  {API_BASE}
                </Link>
              </Text>
            </Box>
          </GridItem>
        </Grid>
      </Container>

      {/* Bottom FAB bar for mobile */}
      <Box
        position="sticky"
        bottom={0}
        bg={useColorModeValue("white", "gray.900")}
        borderTop="1px solid"
        borderColor={ring}
        py={2}
        display={{ base: "block", md: "none" }}
      >
        <Container maxW="container.lg">
          <HStack justify="space-between">
            <IconButton
              aria-label="Subscribe"
              icon={<Icon as={Bell} />}
              onClick={subscribeUser}
              isDisabled={
                !isSupported || isSubscribed || permission === "denied"
              }
            />
            <IconButton
              aria-label="Send"
              icon={<Icon as={BellOff} />}
              onClick={sendNotification}
              isDisabled={!isSubscribed || !isSupported}
            />
            <IconButton
              aria-label="Unsubscribe"
              icon={<Icon as={CheckCircle} />}
              onClick={unsubscribeUser}
              isDisabled={!isSubscribed}
            />
            <IconButton
              aria-label="Install"
              icon={<Icon as={Download} />}
              onClick={handleInstall}
              isDisabled={!canInstall}
            />
          </HStack>
        </Container>
      </Box>
    </Box>
  );
}
