import { lazy, Suspense, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "./pages/NotFound";

const Login = lazy(() => import("./pages/Login"));
const AppLayout = lazy(() => import("./components/AppLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const CourseRegistration = lazy(() => import("./pages/CourseRegistration"));
const Results = lazy(() => import("./pages/Results"));
const Gradesheets = lazy(() => import("./pages/Gradesheets"));
const Attendance = lazy(() => import("./pages/Attendance"));
const FeePayment = lazy(() => import("./pages/FeePayment"));
const Documents = lazy(() => import("./pages/Documents"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ProfessorPortal = lazy(() => import("./pages/ProfessorPortal"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));

const queryClient = new QueryClient();

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function ProtectedRoute({
  children,
  role,
}: {
  children: ReactElement;
  role?: "student" | "professor" | "admin";
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/timetable" element={<Timetable />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route
                    path="/registration"
                    element={
                      <ProtectedRoute role="student">
                        <CourseRegistration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/results"
                    element={
                      <ProtectedRoute role="student">
                        <Results />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/gradesheets"
                    element={
                      <ProtectedRoute role="student">
                        <Gradesheets />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <ProtectedRoute role="student">
                        <Attendance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/fees"
                    element={
                      <ProtectedRoute role="student">
                        <FeePayment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/documents"
                    element={
                      <ProtectedRoute role="student">
                        <Documents />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/professor"
                    element={
                      <ProtectedRoute role="professor">
                        <ProfessorPortal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute role="admin">
                        <AdminPortal />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
