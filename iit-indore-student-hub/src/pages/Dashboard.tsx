import { Link } from "react-router-dom";
import {
  Bell,
  BookOpen,
  BookUser,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileUp,
  ScrollText,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const sharedLinks = [
  { title: "Profile", url: "/profile", icon: User, desc: "View your role-based profile" },
  { title: "Timetable", url: "/timetable", icon: CalendarDays, desc: "See the shared weekly schedule" },
  { title: "Notifications", url: "/notifications", icon: Bell, desc: "Read institute-wide updates" },
];

const studentLinks = [
  { title: "Registration", url: "/registration", icon: BookOpen, desc: "Register for courses" },
  { title: "Results", url: "/results", icon: ClipboardList, desc: "View semester results" },
  { title: "Gradesheets", url: "/gradesheets", icon: ScrollText, desc: "Download gradesheets" },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, desc: "Track attendance" },
  { title: "Fee Payment", url: "/fees", icon: CreditCard, desc: "Pay and view fees" },
  { title: "Documents", url: "/documents", icon: FileUp, desc: "Upload documents" },
];

const professorLinks = [
  { title: "Professor Courses", url: "/professor", icon: BookUser, desc: "Manage courses and research students" },
];

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) return null;

  const quickLinks = [
    ...sharedLinks,
    ...(user.role === "student" ? studentLinks : user.role === "professor" ? professorLinks : []),
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0">
            {user.name.split(" ").map((name) => name[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.department} | {user.role === "student" ? user.programme : user.role === "professor" ? user.designation : "System Admin"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.role === "student" && (
                <>
                  <Badge variant="secondary">Batch {user.batch}</Badge>
                  <Badge variant="secondary">Credits: {user.creditsObtained}/{user.totalCreditsRequired}</Badge>
                </>
              )}
              {user.role === "professor" && (
                <>
                  <Badge variant="secondary">{user.designation}</Badge>
                  <Badge variant="secondary">{user.specialization}</Badge>
                </>
              )}
              <Badge variant="outline">{user.idValue}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link to={link.url} key={link.url}>
            <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{link.title}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{link.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
