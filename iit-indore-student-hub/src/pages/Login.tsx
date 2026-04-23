import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");

  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, userId, password })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Login failed");
      }
      window.localStorage.setItem("iit-userId", userId);
      await login(role, userId);
      if (role === "admin") navigate("/admin");
      else if (role === "professor") navigate("/professor");
      else navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex flex-col items-center gap-3">
            <img src="/logo.webp" alt="IIT Indore" className="h-20 w-20 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Indian Institute of Technology Indore</h1>
              <p className="text-sm text-muted-foreground mt-1">Student Information System</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">{role === "student" ? "Student ID" : "Employee ID"}</Label>
              <Input
                id="userId"
                placeholder={role === "student" ? "e.g. CSE2021045" : "e.g. FAC-CSE-017"}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
            <Button type="submit" className="w-full gap-2">
              <GraduationCap className="h-4 w-4" />
              Sign In
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Use your roll number or employee ID to login with matching role.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
