import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feeData } from "@/data/mockData";
import { CreditCard } from "lucide-react";

export default function FeePayment() {
  const total = feeData.items.reduce((s, i) => s + i.amount, 0);
  const paid = feeData.items.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending = total - paid;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Fee Payment</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Fee</p><p className="text-xl font-bold">₹{total.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold text-green-600">₹{paid.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-destructive">₹{pending.toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{feeData.semester}</span>
            <span className="text-xs text-muted-foreground font-normal">Due: {feeData.dueDate}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeData.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right font-mono">₹{item.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "paid" ? "default" : "destructive"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pending > 0 && (
        <Button className="gap-2" size="lg">
          <CreditCard className="h-4 w-4" /> Pay ₹{pending.toLocaleString("en-IN")} Now
        </Button>
      )}
    </div>
  );
}
