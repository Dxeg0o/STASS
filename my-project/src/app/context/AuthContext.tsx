"use client";

import axios from "axios";
import { getCookie } from "cookies-next";
import { useState, createContext, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
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

      if (!token) {
        return setAuthState({
          data: null,
          error: null,
          loading: false,
        });
      }
      //falta agregar que admin no haga login
      const response = await axios.get(`/api/auth/me`, {
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
    } catch (error: any) {
      setAuthState({
        data: null,
        error: error.response.data.errorMessage,
        loading: false,
      });
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
