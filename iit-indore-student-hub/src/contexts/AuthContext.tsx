import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { professorProfile } from "@/data/mockData";

export type UserRole = "student" | "professor" | "admin";

export interface StudentUser {
  role: "student";
  idLabel: "Roll No.";
  idValue: string;           // roll_no
  name: string;
  email: string;
  batch: number;             // batch_year
  programId: string;
  programme: string;         // program_name
  specialization: string;
  department: string;        // dept_name
  departmentId: string;
  totalCreditsRequired: number;
  creditsObtained: number;
  creditsRegistered: number;
}

export type ProfessorUser = typeof professorProfile & {
  role: "professor";
  idLabel: "Employee ID";
  idValue: string;
};

export interface AdminUser {
  role: "admin";
  name: "System Admin";
  idLabel: "Admin ID";
  idValue: string;
  email: string;
  department: string;
}

type SessionUser = StudentUser | ProfessorUser | AdminUser;

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (role: UserRole, userId?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ROLE_KEY = "iit-indore-student-hub-role";
const USER_ID_KEY = "iit-userId";

async function fetchStudentUser(rollNo: string): Promise<StudentUser> {
  const res = await fetch(`http://localhost:8000/api/student/profile?roll_no=${encodeURIComponent(rollNo)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load student profile" }));
    throw new Error(err.detail || "Failed to load student profile");
  }
  const data = await res.json();
  return {
    role: "student",
    idLabel: "Roll No.",
    idValue: data.roll_no,
    name: data.name,
    email: data.email,
    batch: data.batch_year,
    programId: data.program_id,
    programme: data.program_name,
    specialization: data.specialization ?? "",
    department: data.dept_name,
    departmentId: data.department_id,
    totalCreditsRequired: Number(data.total_credits_required ?? 0),
    creditsObtained: Number(data.credits_obtained ?? 0),
    creditsRegistered: Number(data.credits_registered ?? 0),
  };
}

function buildProfessorUser(): ProfessorUser {
  return { ...professorProfile, role: "professor", idLabel: "Employee ID", idValue: professorProfile.employeeId };
}

function buildAdminUser(userId: string): AdminUser {
  return { role: "admin", name: "System Admin", idLabel: "Admin ID", idValue: userId || "admin", email: "admin@iiti.ac.in", department: "Admin" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_KEY) as UserRole | null;
    const storedUserId = window.localStorage.getItem(USER_ID_KEY) || "";

    const restore = async () => {
      try {
        if (storedRole === "student" && storedUserId) {
          const student = await fetchStudentUser(storedUserId);
          setUser(student);
        } else if (storedRole === "professor") {
          setUser(buildProfessorUser());
        } else if (storedRole === "admin") {
          setUser(buildAdminUser(storedUserId));
        }
      } catch (e) {
        // Stored session no longer valid — clear it
        window.localStorage.removeItem(ROLE_KEY);
        window.localStorage.removeItem(USER_ID_KEY);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (role, userId) => {
        const effectiveId = userId ?? window.localStorage.getItem(USER_ID_KEY) ?? "";
        window.localStorage.setItem(ROLE_KEY, role);
        if (userId) window.localStorage.setItem(USER_ID_KEY, userId);
        if (role === "student") {
          const student = await fetchStudentUser(effectiveId);
          setUser(student);
        } else if (role === "professor") {
          setUser(buildProfessorUser());
        } else {
          setUser(buildAdminUser(effectiveId));
        }
      },
      logout: () => {
        window.localStorage.removeItem(ROLE_KEY);
        window.localStorage.removeItem(USER_ID_KEY);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
