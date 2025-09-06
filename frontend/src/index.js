import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { ChakraProvider, ColorModeScript, Box } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import theme from "./theme";
import { AuthProvider } from "./context/AuthContext";
import { InquiryProvider } from "./context/InquiryContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <InquiryProvider>
        <ChakraProvider theme={theme}>
          <BrowserRouter>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />

            {/* Main App */}
            <App />

            {/* 🌐 Global Footer */}
            {/* <Box
              as="footer"
              textAlign="center"
              py={1}
              fontSize="2px"
              color="gray.500"
              // borderTop="1px solid"
              // borderColor="gray.200"
              bg="transparent"
            >
              Developed by <strong>Expound Technivo</strong>
            </Box> */}
          </BrowserRouter>
        </ChakraProvider>
      </InquiryProvider>
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
// Register the service worker for offline/PWA support
serviceWorkerRegistration.register();
