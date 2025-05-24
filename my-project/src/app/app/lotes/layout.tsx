"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import AuthContext, { AuthenticationContext } from "../../context/AuthContext";
import ProtectedRoute from "../ProtectedRoute";
import { useContext } from "react";

// 1) This little guard only lives here in Layout:
function RoleGuard({ children }: { children: React.ReactNode }) {
  const { data } = useContext(AuthenticationContext);

  // Once we're past ProtectedRoute, we know data?.id exists.
  // Now if rol !== "admin", we block:
  console.log(data?.rol_usuario);
  if (data?.rol_usuario !== "admin") {
    return <p className="text-red-600 text-center mt-8">No puedes acceder</p>;
  }

  // otherwise render the real page
  return <>{children}</>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-w-full min-h-screen flex flex-col">
        <div className="flex flex-1">
          <main className="flex-1">
            {/* 2) Provide auth context */}
            <AuthContext>
              {/* 3) Only redirect non-logged-in users */}
              <ProtectedRoute>
                {/* 4) Then only-admin check */}
                <RoleGuard>{children}</RoleGuard>
              </ProtectedRoute>
            </AuthContext>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
