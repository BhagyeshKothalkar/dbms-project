import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ProfessorPortal() {
  const [sections, setSections] = useState<any[]>([]);
  const [infoDrafts, setInfoDrafts] = useState<Record<string, string>>({});
  
  const loadMySections = async () => {
    const profId = window.localStorage.getItem("iit-userId") || "FAC-CSE-017";
    try {
      const res = await fetch(`http://localhost:8000/api/prof/my_sections?prof_id=${profId}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
        
        const drafts: Record<string, string> = {};
        data.sections.forEach((sec: any) => {
          drafts[sec.section_id] = sec.additional_info || "";
        });
        setInfoDrafts(drafts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadMySections(); }, []);

  const saveInfo = async (sectionId: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/prof/section_info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, additional_info: infoDrafts[sectionId] })
      });
      if (res.ok) alert("Course information updated successfully!");
      else { const e = await res.json(); alert("Error: " + e.detail); }
    } catch (err) { alert(err); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Professor Workspace</h1>
        <p className="text-sm text-muted-foreground">Manage your assigned sections, update syllabi, and inject course information.</p>
      </div>

      {!sections.length ? (
        <Card className="p-8 text-center text-muted-foreground">You have no sections assigned by the administration.</Card>
      ) : (
        <Tabs defaultValue={sections[0]?.section_id} className="space-y-6">
          <TabsList className="h-auto flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {sections.map((sec) => (
              <TabsTrigger key={sec.section_id} value={sec.section_id} className="border bg-background data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {sec.course_code}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((sec) => (
            <TabsContent key={sec.section_id} value={sec.section_id} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>{sec.course_code} - {sec.course_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Section: {sec.section_id} • L-T-P: {sec.ltp}</p>
                    </div>
                    <Badge variant="outline">Assigned by Administration</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <Card className="col-span-1 lg:col-span-2">
                    <CardHeader className="pb-3"><CardTitle className="text-base">Course Information & Syllabus</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Provide additional syllabus details, grading schemes, or prerequisite information that students should know.</p>
                      <Textarea 
                         rows={8}
                         placeholder="Type additional course info..." 
                         value={infoDrafts[sec.section_id] || ""}
                         onChange={e => setInfoDrafts({...infoDrafts, [sec.section_id]: e.target.value})}
                      />
                      <Button onClick={() => saveInfo(sec.section_id)} className="w-48">Publish Information</Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
