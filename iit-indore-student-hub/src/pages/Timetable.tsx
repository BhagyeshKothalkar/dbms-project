import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function Timetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTimetable = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/timetable?user_id=${user.idValue}&role=${user.role}`);
        const data = await res.json();
        setTimetable(data.timetable || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Institute Timetable</h1>
        <p className="text-sm text-muted-foreground">Your personalized weekly schedule based on registered courses.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading timetable...</p>
      ) : timetable.length === 0 ? (
        <p className="text-sm text-muted-foreground">No timetable slots found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {timetable.map((entry, i) => (
            <Card key={`${entry.day}-${entry.slot}-${entry.title}-${i}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  <Badge variant="outline">{entry.day}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-medium">Time:</span> {entry.slot}</p>
                <p><span className="font-medium">Venue:</span> {entry.venue || 'TBA'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
