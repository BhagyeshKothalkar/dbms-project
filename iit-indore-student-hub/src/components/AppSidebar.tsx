import {
  Bell, BookOpen, BookUser, CalendarCheck, CalendarDays,
  ClipboardList, CreditCard, FileUp, LayoutDashboard, LogOut, ScrollText, Shield, User
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const publicNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Timetable", url: "/timetable", icon: CalendarDays },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

const studentNavItems = [
  { title: "Course Registration", url: "/registration", icon: BookOpen },
  { title: "Results", url: "/results", icon: ClipboardList },
  { title: "Gradesheets", url: "/gradesheets", icon: ScrollText },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Fee Payment", url: "/fees", icon: CreditCard },
  { title: "Documents", url: "/documents", icon: FileUp },
];

const professorNavItems = [
  { title: "Professor Courses", url: "/professor", icon: BookUser },
];

const adminNavItems = [
  { title: "Admin Portal", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleNavItems =
    user.role === "student" ? studentNavItems
    : user.role === "professor" ? professorNavItems
    : adminNavItems;

  const navItems = [...publicNavItems, ...roleNavItems];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <img src="/logo.webp" alt="IIT Indore" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground leading-tight">IIT Indore</p>
              <p className="text-[11px] text-sidebar-foreground/60">
                {user.role === "student" ? "Student Portal" : user.role === "professor" ? "Faculty Portal" : "Admin Portal"}
              </p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
