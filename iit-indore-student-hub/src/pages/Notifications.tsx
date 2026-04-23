import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/data/mockData";

export default function Notifications() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Institute-wide updates, reminders, and academic announcements.</p>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge>{item.category}</Badge>
                  <Badge variant="outline">{item.date}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
