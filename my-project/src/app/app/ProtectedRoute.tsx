"use client";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, loading } = useContext(AuthenticationContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !data?.id) {
      router.push("/login");
    }
  }, [loading, data, router]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-transparent border-blue-500 border-4 w-8 h-8 rounded-full animate-spin"></div>
      </div>
    );

  // Mientras se espera la redirección, no se muestra contenido
  if (!loading && !data?.id) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
