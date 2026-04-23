import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Search, Calendar as CalendarIcon, Lock } from "lucide-react";

export default function CourseRegistration() {
  const [isLocked, setIsLocked] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [semFilter, setSemFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  const loadPool = async () => {
    const userId = window.localStorage.getItem("iit-userId") || "CSE2021045";

    // First, force auto-enrollment of Core mapped constraints natively
    try {
      await fetch("http://localhost:8000/api/courses/auto_enroll_core", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: userId })
      });
    } catch (e) { console.error("Auto-enrolling core skipped/failed"); }

    try {
      const resList = await fetch(`http://localhost:8000/api/courses/available?student_id=${userId}`);
      const dataList = await resList.json();
      setCourses(dataList.courses || []);

      const resReg = await fetch(`http://localhost:8000/api/courses/registered?student_id=${userId}`);
      const dataReg = await resReg.json();
      setRegistered(new Set(dataReg.registeredCourseIds || []));
      setIsLocked(dataReg.locked || false);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { loadPool(); }, []);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (search && !`${c.code} ${c.name} ${c.instructor}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (semFilter !== "all" && c.semester !== Number(semFilter)) return false;
      if (deptFilter !== "all" && c.department !== deptFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (modeFilter !== "all" && c.mode !== modeFilter) return false;
      return true;
    });
  }, [courses, search, semFilter, deptFilter, typeFilter, modeFilter]);

  const regCourses = courses.filter(c => registered.has(c.id));
  const totalCredits = regCourses.reduce((s, c) => s + (c.mode === "audit" ? 0 : c.credits), 0);

  const toggle = async (id: string, type: string) => {
    if (type === 'Core' && registered.has(id)) {
      return toast.error("Security Block: Core courses are strictly bound to your graduation limits and cannot be dropped!");
    }

    const isReg = registered.has(id);
    const endpoint = isReg ? "/api/courses/drop" : "/api/courses/register";
    const method = isReg ? "DELETE" : "POST";
    const userId = window.localStorage.getItem("iit-userId") || "CSE2021045";

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: userId, section_id: id })
      });
      if (res.ok) {
        setRegistered(prev => {
          const next = new Set(prev);
          isReg ? next.delete(id) : next.add(id);
          return next;
        });
      } else {
        const err = await res.json();
        toast.error(err.detail); // Mathematical boundaries will trigger natively here from structural limits!
      }
    } catch (e) {
      console.error(e);
    }
  };


  const lockRegistration = async () => {
    const userId = window.localStorage.getItem("iit-userId") || "CSE2021045";
    try {
      const res = await fetch("http://localhost:8000/api/courses/lock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: userId })
      });
      if (res.ok) {
        setIsLocked(true);
        toast.success("Registration Successfully Locked!");
      } else {
        const err = await res.json();
        toast.error(err.detail);
      }
    } catch (e: any) { toast.error(e.message || String(e)); }
  };

  // Live Timetable Parse Logic
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const workingHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  // Find which course fits a block
  const getCourseForSlot = (day: string, hour: number) => {
    let overlay = null;
    regCourses.forEach(c => {
      if (c.schedule && c.schedule !== 'TBD') {
        // Example format "Monday 10:00:00-11:30:00"
        const [cDay, times] = c.schedule.split(" ");
        if (cDay === day && times) {
          const [st] = times.split("-");
          const h = parseInt(st.split(":")[0], 10);
          if (h === hour || (hour > h && hour < h + 2)) {
            overlay = c;
          }
        }
      }
    });
    return overlay;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registration & Live Curriculum</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Select Board */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Core">Core Block</SelectItem>
                    <SelectItem value="Department Elective">Dept Elective</SelectItem>
                    <SelectItem value="Institute Elective">Inst Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Available courses table */}
          <Card className="h-[600px] overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Course Pool Authorization</span>
                <Badge variant="outline">{filtered.length} Discovered</Badge>
              </CardTitle>
            </CardHeader>
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                    <TableHead>Cr</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const isReg = registered.has(c.id);
                    const isCore = c.type === 'Core';

                    return (
                      <TableRow key={c.id} className={isReg ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono text-xs">{c.code}</TableCell>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{c.schedule}</TableCell>
                        <TableCell>{c.credits}</TableCell>
                        <TableCell>
                          <Badge variant={isCore ? "default" : "outline"} className="text-[10px]">
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isCore && isReg ? (
                            <Button size="sm" variant="secondary" className="h-7 cursor-not-allowed" disabled>
                              <Lock className="h-3 w-3 mr-1" /> Locked
                            </Button>
                          ) : isLocked ? (
                            <Button size="sm" variant="secondary" className="h-7 cursor-not-allowed" disabled>
                              <Lock className="h-3 w-3 mr-1" /> Locked
                            </Button>
                          ) : (
                            <Button size="sm" variant={isReg ? "destructive" : "default"} className="h-7 text-xs" onClick={() => toggle(c.id, c.type)}>
                              {isReg ? <><Minus className="h-3 w-3 mr-1" /> Drop</> : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right Layout: Summary & Matrix */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Registered Package</span>
                <Badge variant="default" className="text-sm px-3 py-1">{totalCredits} / Max Credits</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {regCourses.map(c => (
                  <Badge key={c.id} variant={c.type === 'Core' ? 'default' : 'secondary'} className="px-2 py-1 flex items-center gap-2">
                    <span className="font-mono text-xs">{c.code}</span>
                    {!c.type.includes('Core') && !isLocked && (
                      <button onClick={() => toggle(c.id, c.type)} className="hover:text-destructive transition-colors"><Minus className="h-3 w-3" /></button>
                    )}
                  </Badge>
                ))}
                {regCourses.length === 0 && <span className="text-sm text-muted-foreground">Empty Pipeline.</span>}
              </div>
              <div className="mt-4 border-t pt-4 border-primary/10">
                {!isLocked ? (
                  <Button className="w-full gap-2" variant="default" onClick={lockRegistration}>
                    <Lock className="w-4 h-4" /> Confirm & Lock Selections
                  </Button>
                ) : (
                  <Button className="w-full gap-2" variant="secondary" disabled>
                    <Lock className="w-4 h-4" /> Registration Officially Locked
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LIVE Matrix */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <CalendarIcon className="w-4 h-4" />
                Live Matrix
              </CardTitle>
              <CardDescription>Overlaps render real-time</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="grid grid-cols-6 border-b text-[10px] uppercase font-bold tracking-wider bg-muted/30">
                <div className="p-2 border-r text-center">Time</div>
                {daysOfWeek.map(d => <div key={d} className="p-2 border-r text-center border-r-last-none">{d.substring(0, 3)}</div>)}
              </div>
              <div className="h-[430px] overflow-y-auto">
                {workingHours.map(hour => (
                  <div key={hour} className="grid grid-cols-6 border-b text-xs hover:bg-muted/10 transition-colors">
                    <div className="p-2 border-r font-mono text-muted-foreground text-center flex items-center justify-center">
                      {hour}:00
                    </div>
                    {daysOfWeek.map(day => {
                      const c: any = getCourseForSlot(day, hour);
                      return (
                        <div key={`${day}-${hour}`} className={`p-1 border-r text-center border-r-last-none flex items-center justify-center ${c ? (c.type === 'Core' ? 'bg-primary/20 text-primary-foreground font-semibold border-primary/30' : 'bg-green-500/20 text-green-700 font-semibold border-green-500/30') : ''}`}>
                          {c ? c.code : ''}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
