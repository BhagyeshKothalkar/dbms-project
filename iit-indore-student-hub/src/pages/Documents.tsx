import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadedDocuments } from "@/data/mockData";
import { Upload, FileText, CheckCircle2, Clock } from "lucide-react";

export default function Documents() {
  const [docs, setDocs] = useState(uploadedDocuments);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newDoc = {
      id: String(Date.now()),
      name: file.name,
      type: file.type || "Other",
      uploadDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      status: "pending" as const,
      size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
    };
    setDocs(prev => [...prev, newDoc]);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Document Upload</h1>

      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Drag & drop files here, or click to browse</p>
            <div className="relative inline-block">
              <Button variant="outline" className="gap-2 relative overflow-hidden cursor-pointer">
                <FileText className="h-4 w-4" /> Choose File
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleUpload} 
                />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Supported: PDF, JPG, PNG (max 5MB)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Uploaded Documents</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{doc.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{doc.type}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{doc.size}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{doc.uploadDate}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "verified" ? "default" : "secondary"} className="gap-1">
                      {doc.status === "verified" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {doc.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
