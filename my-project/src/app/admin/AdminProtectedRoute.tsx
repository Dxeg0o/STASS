"use client";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, loading } = useContext(AuthenticationContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !data?.id) {
      router.push("/login");
    } else if (!loading && data?.id && !data?.isSuperAdmin) {
      router.push("/select-empresa");
    }
  }, [loading, data, router]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="spinner border-t-transparent border-amber-500 border-4 w-8 h-8 rounded-full animate-spin"></div>
      </div>
    );

  if (!loading && (!data?.id || !data?.isSuperAdmin)) {
    return null;
  }

  return <>{children}</>;
}

export default AdminProtectedRoute;
