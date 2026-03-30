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
    } else if (!loading && data?.id && !data?.empresaId) {
      // Authenticated but no empresa selected
      router.push("/select-empresa");
    }
  }, [loading, data, router]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-transparent border-blue-500 border-4 w-8 h-8 rounded-full animate-spin"></div>
      </div>
    );

  if (!loading && (!data?.id || !data?.empresaId)) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
