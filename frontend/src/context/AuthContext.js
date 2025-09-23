// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

// Create Context
const AuthContext = createContext();

// Hook for easy usage
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Direct login — no API call
  const login = async (username, password) => {
    setLoading(true);
    try {
      const userData = {
        username: username || "demoUser",
        role: "admin",
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("username", username);

      toast({
        title: "Login Successful",
        description: `Welcome ${username || "Demo User"}!`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });

      navigate("/inquiries");
    } catch (err) {
      toast({
        title: "Login Failed",
        description: "Unexpected error occurred",
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
    localStorage.removeItem("username");

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
      status: "info",
      duration: 3000,
      isClosable: true,
      position: "top-right",
    });

    navigate("/");
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
