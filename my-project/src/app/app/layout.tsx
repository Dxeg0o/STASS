import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";

// ... imports existentes ...

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-w-full min-h-screen flex flex-col">
        <nav className="w-full h-14 border-b bg-white flex items-center px-4">
          <h1 className="font-semibold">STASS</h1>
        </nav>
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1">
            <SidebarTrigger />
            <div className="flex flex-col justify-center items-center">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
