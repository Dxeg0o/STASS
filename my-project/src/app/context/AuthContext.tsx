"use client";

import axios from "axios";
import { getCookie } from "cookies-next";
import { useState, createContext, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  empresaId: string;
}

interface State {
  loading: boolean;
  data: User | null;
  error: string | null;
}

interface AuthState extends State {
  setAuthState?: React.Dispatch<React.SetStateAction<State>>;
}

export const AuthenticationContext = createContext<AuthState>({
  loading: false,
  error: null,
  data: null,
});

export default function AuthContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authState, setAuthState] = useState<State>({
    loading: true,
    data: null,
    error: null,
  });

  const fetchUser = async () => {
    setAuthState({
      data: null,
      error: null,
      loading: true,
    });
    try {
      const token = getCookie("token");
      console.log(token);

      if (!token) {
        return setAuthState({
          data: null,
          error: null,
          loading: false,
        });
      }
      const response = await axios.get<User>(`/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setAuthState({
        data: response.data,
        error: null,
        loading: false,
      });
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setAuthState({
          data: null,
          error:
            error.response?.data?.errorMessage || "An unknown error occurred.",
          loading: false,
        });
      } else {
        setAuthState({
          data: null,
          error: "An unexpected error occurred.",
          loading: false,
        });
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthenticationContext.Provider
      value={{
        ...authState,
        setAuthState,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
