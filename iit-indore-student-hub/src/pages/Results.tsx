import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { results } from "@/data/mockData";

export default function Results() {
  const allCredits = results.flatMap(r => r.courses);
  const totalCreditPoints = allCredits.reduce((s, c) => s + c.credits * c.points, 0);
  const totalCredits = allCredits.reduce((s, c) => s + c.credits, 0);
  const cgpa = (totalCreditPoints / totalCredits).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Academic Results</h1>
        <Badge className="text-sm px-3 py-1">CGPA: {cgpa}</Badge>
      </div>

      {results.map(sem => (
        <Card key={sem.semester}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Semester {sem.semester} ({sem.year})</span>
              <Badge variant="secondary">SGPA: {sem.sgpa.toFixed(2)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sem.courses.map(c => (
                  <TableRow key={c.code}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.credits}</TableCell>
                    <TableCell><Badge variant="outline">{c.grade}</Badge></TableCell>
                    <TableCell>{c.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
