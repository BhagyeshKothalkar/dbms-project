import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicTimetable } from "@/data/mockData";

export default function Timetable() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Institute Timetable</h1>
        <p className="text-sm text-muted-foreground">Shared weekly schedule visible to all portal users.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {publicTimetable.map((entry) => (
          <Card key={`${entry.day}-${entry.slot}-${entry.title}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{entry.title}</CardTitle>
                <Badge variant="outline">{entry.day}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">Time:</span> {entry.slot}</p>
              <p><span className="font-medium">Venue:</span> {entry.venue}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
