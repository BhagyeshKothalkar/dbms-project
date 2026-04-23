import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { attendanceData } from "@/data/mockData";

const statusColor = (p: number) => p >= 75 ? "text-green-600" : p >= 65 ? "text-yellow-600" : "text-red-600";
const statusBadge = (p: number): "default" | "secondary" | "destructive" =>
  p >= 75 ? "default" : p >= 65 ? "secondary" : "destructive";

export default function Attendance() {
  const overall = attendanceData.reduce((s, c) => s + c.attended, 0) / attendanceData.reduce((s, c) => s + c.total, 0) * 100;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Badge className="text-sm px-3 py-1">Overall: {overall.toFixed(1)}%</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="hidden sm:table-cell">Attended</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead className="w-40 hidden md:table-cell">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceData.map(c => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{c.attended}/{c.total}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge(c.percentage)}>
                      <span className={statusColor(c.percentage)}>{c.percentage.toFixed(1)}%</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Progress value={c.percentage} className="h-2" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>🟢 ≥75% — Eligible &nbsp; 🟡 65-75% — Warning &nbsp; 🔴 &lt;65% — Short attendance</p>
      </div>
    </div>
  );
}
