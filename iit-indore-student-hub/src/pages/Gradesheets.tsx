import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { results } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { Printer } from "lucide-react";

export default function Gradesheets() {
  const { user } = useAuth();
  const [selected, setSelected] = useState("1");
  const sem = results.find(r => r.semester === Number(selected));
  if (!sem) return null;

  const totalCP = sem.courses.reduce((s, c) => s + c.credits * c.points, 0);
  const totalCr = sem.courses.reduce((s, c) => s + c.credits, 0);

  const student = user?.role === "student" ? user : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Gradesheet</h1>
        <div className="flex gap-2 items-center">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {results.map(r => (
                <SelectItem key={r.semester} value={String(r.semester)}>Semester {r.semester}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1 no-print" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex justify-center mb-2">
            <img src="/logo.webp" alt="IIT Indore" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-lg">Indian Institute of Technology Indore</CardTitle>
          <p className="text-sm text-muted-foreground">Grade Sheet — Semester {sem.semester} ({sem.year})</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {student?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Roll No:</span> {student?.idValue ?? "—"}</p>
            <p><span className="text-muted-foreground">Programme:</span> {student?.programme ?? "—"}</p>
            <p><span className="text-muted-foreground">Department:</span> {student?.department ?? "—"}</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Grade Points</TableHead>
                <TableHead>Credit Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sem.courses.map(c => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.credits}</TableCell>
                  <TableCell>{c.grade}</TableCell>
                  <TableCell>{c.points}</TableCell>
                  <TableCell>{c.credits * c.points}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>{totalCr}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{totalCP}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="text-right text-sm font-medium pt-2 border-t">
            SGPA: <span className="text-primary font-bold">{sem.sgpa.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
