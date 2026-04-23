import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const Field = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

export default function Profile() {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{user.role === "student" ? "Student Profile" : "Professor Profile"}</h1>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold flex-shrink-0 mx-auto sm:mx-0">
            {user.name.split(" ").map((name) => name[0]).join("")}
          </div>
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.idValue}</p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge>{user.role === "student" ? user.programme : user.role === "professor" ? user.designation : "Administrator"}</Badge>
              <Badge variant="secondary">{user.department}</Badge>
              {user.role === "student" && <Badge variant="outline">{`Batch ${user.batch}`}</Badge>}
              {user.role === "professor" && <Badge variant="outline">{user.office}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === "student" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Roll No." value={user.idValue} />
              <Field label="Programme" value={user.programme} />
              <Field label="Specialization" value={user.specialization || "—"} />
              <Field label="Department" value={user.department} />
              <Field label="Batch Year" value={user.batch} />
              <Field label="Program ID" value={user.programId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Credits & Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Email" value={user.email} />
              <Field label="Credits Obtained" value={user.creditsObtained} />
              <Field label="Credits Registered" value={user.creditsRegistered} />
              <Field label="Total Credits Required" value={user.totalCreditsRequired} />
            </CardContent>
          </Card>
        </div>
      )}

      {user.role === "professor" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Professional Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Designation" value={user.designation} />
              <Field label="Department" value={user.department} />
              <Field label="Employee ID" value={user.employeeId} />
              <Field label="Office" value={user.office} />
              <Field label="Specialization" value={user.specialization} />
              <Field label="Email" value={user.email} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Phone" value={user.phone} />
              <Field label="Office" value={user.office} />
              <Field label="Email" value={user.email} />
              <Field label="Department" value={user.department} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
