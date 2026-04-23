import { Outlet } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./theme-toggle";

export default function AppLayout() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm text-foreground hidden sm:inline">Student Information System</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.idValue}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user.name.split(" ").map((name) => name[0]).join("")}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
