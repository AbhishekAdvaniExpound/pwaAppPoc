// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@chakra-ui/react";

// Create Context
const AuthContext = createContext();

// Hook for easy usage
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      if (response.data.success) {
        setUser(response.data.data);
        localStorage.setItem("user", JSON.stringify(response.data.data));

        // ✅ Success toast
        toast({
          title: "Login Successful",
          description: `Welcome ${username}!`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        setError("Invalid login response");

        // ❌ Error toast
        toast({
          title: "Login Failed",
          description: "Invalid response from server",
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Login failed";
      setError(errMsg);

      // ❌ Error toast
      toast({
        title: "Login Failed",
        description: errMsg,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");

    // ⚠️ Info toast
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top-right",
    });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
