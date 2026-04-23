import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function AdminPortal() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<{course_code: string, course_name: string}[]>([]);
  const [professors, setProfessors] = useState<{employee_id: string, name: string}[]>([]);
  
  // Infrastructure state
  const [departments, setDepartments] = useState<{department_id: string, dept_name: string}[]>([]);
  const [terms, setTerms] = useState<{term_id: string, term_name: string}[]>([]);
  const [venues, setVenues] = useState<{venue_id: string, building_name: string, room_number: string, capacity: number}[]>([]);
  const [programs, setPrograms] = useState<{program_id: string, program_name: string}[]>([]);

  // INFRASTRUCTURE BUILDER STATE
  const [newDeptId, setNewDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  
  const [newTermId, setNewTermId] = useState("");
  const [newTermName, setNewTermName] = useState("");
  const [newTermStart, setNewTermStart] = useState("");
  const [newTermEnd, setNewTermEnd] = useState("");

  const [newVenueId, setNewVenueId] = useState("");
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newRoomNo, setNewRoomNo] = useState("");
  const [newRoomCap, setNewRoomCap] = useState(100);

  // Base Course Spawner State
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [cType, setCType] = useState("Core");
  const [cDept, setCDept] = useState("");
  const [cCredits, setCCredits] = useState(3);
  const [cLtp, setCLtp] = useState("3-0-0");
  const [cSemCode, setCSemCode] = useState(1);

  // Section & Professor Assignment
  const [selectedCourse, setSelectedCourse] = useState("");
  const [secTerm, setSecTerm] = useState("");
  const [secName, setSecName] = useState("A");
  const [secVenue, setSecVenue] = useState("");
  const [secCapacity, setSecCapacity] = useState(50);
  const [assignedProf, setAssignedProf] = useState("");

  // Timetable Allocation
  const [targetSecId, setTargetSecId] = useState(""); // For timetable targeting
  const [venue, setVenue] = useState("");
  const [day, setDay] = useState("Monday");
  const [stTime, setStTime] = useState("10:00:00");
  const [enTime, setEnTime] = useState("11:30:00");

  // SEMESTER BUILDER STATE
  const [buildTerm, setBuildTerm] = useState("");
  const [buildDept, setBuildDept] = useState("");
  const [buildSemCode, setBuildSemCode] = useState(6);
  const [buildBatchYear, setBuildBatchYear] = useState(2021);
  const [tgtCore, setTgtCore] = useState(12);
  const [tgtDept, setTgtDept] = useState(3);
  const [tgtInst, setTgtInst] = useState(2);
  
  const [termSections, setTermSections] = useState<any[]>([]);
  const [selectedSecIds, setSelectedSecIds] = useState<string[]>([]);
  const [termPoolFilter, setTermPoolFilter] = useState("All");
  const [termDeptFilter, setTermDeptFilter] = useState("All");

  // USER MANAGEMENT STATE
  const [cpId, setCpId] = useState("");
  const [cpName, setCpName] = useState("");
  const [cpSpec, setCpSpec] = useState("");
  const [cpDept, setCpDept] = useState("");
  const [cpCredits, setCpCredits] = useState(160);

  const [profId, setProfId] = useState("");
  const [profName, setProfName] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profDept, setProfDept] = useState("");
  const [profDesig, setProfDesig] = useState("Assistant Professor");

  const [stuId, setStuId] = useState("");
  const [stuName, setStuName] = useState("");
  const [stuEmail, setStuEmail] = useState("");
  const [stuProg, setStuProg] = useState("");
  const [stuBatch, setStuBatch] = useState(2026);

  // PREREQUISITE MANAGEMENT STATE
  const [prereqCourse, setPrereqCourse] = useState("");
  const [prereqTarget, setPrereqTarget] = useState("");
  const [coursePrereqs, setCoursePrereqs] = useState<string[]>([]);

  // COMMON COURSES STATE (for multi-branch publishing)
  const [commonBranches, setCommonBranches] = useState<string[]>([]); // e.g., ["CSE2021", "EE2021"]
  const [commonDept, setCommonDept] = useState("");
  const [commonYear, setCommonYear] = useState(2021);

  const loadDependencies = async () => {
    try {
      const crsRes = await fetch("http://localhost:8000/api/courses/all");
      const crsData = await crsRes.json();
      setCourses(crsData.courses || []);

      const profRes = await fetch("http://localhost:8000/api/professors/all");
      const profData = await profRes.json();
      setProfessors(profData.professors || []);

      const deptRes = await fetch("http://localhost:8000/api/admin/departments");
      setDepartments((await deptRes.json()).departments || []);

      const termRes = await fetch("http://localhost:8000/api/admin/terms");
      setTerms((await termRes.json()).terms || []);

      const venRes = await fetch("http://localhost:8000/api/venues/all");
      setVenues((await venRes.json()).venues || []);

      const progRes = await fetch("http://localhost:8000/api/admin/programs");
      setPrograms((await progRes.json()).programs || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadDependencies(); }, []);

  // --- INFRASTRUCTURE ACTIONS ---
  const saveDept = async () => {
    if (!newDeptId || !newDeptName) return toast({ description: "Missing details!" });
    try {
      const res = await fetch("http://localhost:8000/api/admin/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: newDeptId, dept_name: newDeptName })
      });
      if (res.ok) { if (res.ok) { toast({ description: "Department Defined!" }); loadDependencies(); } }
      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }

    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const saveTerm = async () => {
    if (!newTermId || !newTermStart || !newTermEnd) return toast({ description: "Missing details!" });
    try {
      const res = await fetch("http://localhost:8000/api/admin/terms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term_id: newTermId, term_name: newTermName, start_date: newTermStart, end_date: newTermEnd })
      });
      if (res.ok) { if (res.ok) { toast({ description: "Academic Term Defined!" }); loadDependencies(); } }
      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }

    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const saveVenue = async () => {
    if (!newVenueId) return toast({ description: "Missing details!" });
    try {
      const res = await fetch("http://localhost:8000/api/admin/venues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: newVenueId, building_name: newBuildingName, room_number: newRoomNo, capacity: newRoomCap })
      });
      if (res.ok) { if (res.ok) { toast({ description: "Facility Venue Defined!" }); loadDependencies(); } }
      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }

    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const saveProgram = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/programs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: cpId, program_name: cpName, specialization: cpSpec, department_id: cpDept, total_credits: cpCredits })
      });
      if (res.ok) { if (res.ok) { toast({ description: "Program Created!" }); loadDependencies(); } }
      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }

    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const saveProfessor = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/professors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: profId, name: profName, email: profEmail, department_id: profDept, designation: profDesig })
      });
      if (res.ok) { if (res.ok) { toast({ description: "Professor Identity Generated!" }); loadDependencies(); } }
      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }

    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const saveStudent = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roll_no: stuId, name: stuName, email: stuEmail, program_id: stuProg, batch_year: stuBatch })
      });
      if (res.ok) {
         toast({ description: `Student Created: ${stuId}` });
      } else {
         const e = await res.json();
         throw new Error(e.detail || "Server Error");
      }
    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  // --- COURSE ACTIONS ---
  const saveCourse = async () => {
    if (!cDept || !cCode) return toast({ description: "Department and Suffix required!" });
    const fullCode = `${cDept}${cCode}`;
    try {
      const res = await fetch("http://localhost:8000/api/admin/courses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_code: fullCode, course_name: cName, credits: cCredits, department_id: cDept, course_type: cType, ltp: cLtp, semester_code: cSemCode })
      });
      if (res.ok) {
        toast({ description: `Base Course ${fullCode} registered successfully!` });
        loadDependencies();
      } else {
        const e = await res.json();
        throw new Error(e.detail || "Server Error");
      }
    } catch (err: any) { toast({ description: err.message || String(err), variant: "destructive" }); }
  };

  const createSection = async () => {
    if (!selectedCourse || !secTerm || !secVenue) return toast({ description: "Select Course, Term, and Venue!" });

    try {
      const res = await fetch("http://localhost:8000/api/admin/course_sections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          course_code: selectedCourse, 
          term_id: secTerm, 
          section_name: secName, 
          primary_professor_id: assignedProf,
          venue_id: secVenue,
          capacity: secCapacity
        })
      });
      if (res.ok) {
        const data = await res.json();
        toast({ description: `Section Created: ${data.section_id} (Capacity: ${data.capacity}/${data.venue_capacity} venue seats)` });
        setTargetSecId(data.section_id);
      }
      else { const e = await res.json(); toast({ description: e.detail, variant: "destructive" }); }
    } catch (err: any) { toast({ description: err.message || String(err), variant: "destructive" }); }
  };

  const createSlot = async () => {
    if (!targetSecId || !venue) return toast({ description: "Target Section and Venue required!" });
    
    // Auto-generate Slot ID securely
    const generatedSlotId = `${targetSecId}-${day.substring(0,3)}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

    try {
      const res = await fetch("http://localhost:8000/api/admin/timetable_slots", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: generatedSlotId, section_id: targetSecId, venue_id: venue, day_of_week: day, start_time: stTime, end_time: enTime })
      });
      if (res.ok) toast({ description: `Slot successfully bound logic! ID: ${generatedSlotId}` });
      else { const e = await res.json(); toast({ description: e.detail, variant: "destructive" }); }
    } catch (err: any) { toast({ description: err.message || String(err), variant: "destructive" }); }
  };

  // --- BUILDER ACTIONS ---
  const fetchTermSections = async () => {
    if (!buildTerm) return toast({ description: "Select a Term first!" });
    try {
      const res = await fetch(`http://localhost:8000/api/admin/term_sections?term_id=${buildTerm}`);
      const data = await res.json();
      setTermSections(data.sections || []);
      setSelectedSecIds([]);
    } catch(err) { console.error(err); }
  };

  const toggleSection = (sec: any) => {
    const isSelected = selectedSecIds.includes(sec.section_id);
    if (isSelected) {
      setSelectedSecIds(selectedSecIds.filter(x => x !== sec.section_id));
    } else {
      // Enforce Math Locking Constraints
      let crCore = 0; let crInst = 0;
      termSections.filter(s => selectedSecIds.includes(s.section_id)).forEach(s => {
        if (s.course_type === 'Core') crCore += s.credits;
        if (s.course_type === 'Institute Elective') crInst += s.credits;
      });
      
      if (sec.course_type === 'Core' && crCore + sec.credits > tgtCore) {
         return toast({ description: `Limit Exceeded! Adding this would exceed Core Target of ${tgtCore}` });
      }

      setSelectedSecIds([...selectedSecIds, sec.section_id]);
    }
  };

  const publishSemester = async () => {
    if (!buildTerm || !buildDept) return toast({ description: "Define Term and Dept first!" });
    
    // Subset Sum Algorithmic Partitioning Check
    const deptElectives = termSections
        .filter(s => selectedSecIds.includes(s.section_id) && s.course_type === 'Department Elective')
        .map(s => s.credits);

    if (tgtDept > 0 && deptElectives.length > 0) {
        const sum = deptElectives.reduce((a: number, b: number) => a + b, 0);
        if (sum % tgtDept !== 0) {
            return toast({ description: `Cannot publish! The sum of Department Electives (${sum}) is not a clean multiple of the target (${tgtDept}).`, variant: "destructive" });
        }
        
        const k = sum / tgtDept;
        deptElectives.sort((a: number, b: number) => b - a);
        const bucket = new Array(k).fill(0);

        const backtrack = (index: number): boolean => {
            if (index === deptElectives.length) return true;
            for (let i = 0; i < k; i++) {
                if (bucket[i] + deptElectives[index] <= tgtDept) {
                    bucket[i] += deptElectives[index];
                    if (backtrack(index + 1)) return true;
                    bucket[i] -= deptElectives[index];
                }
                if (bucket[i] === 0) break; // Optimization trick
            }
            return false;
        };

        if (!backtrack(0)) {
            return toast({ description: `Cannot publish! The chosen Department Electives cannot be perfectly partitioned into valid bundles matching your strict target threshold of ${tgtDept}.`, variant: "destructive" });
        }
    } else if (tgtDept > 0 && deptElectives.length === 0) {
        return toast({ description: "You have required Department Electives but provided no options in the pool!", variant: "destructive" });
    }

    try {
      const payload = {
        term_id: buildTerm, department_id: buildDept, semester_code: buildSemCode, batch_year: buildBatchYear,
        core_credits: tgtCore, dept_elective_credits: tgtDept, inst_elective_credits: tgtInst,
        section_ids: selectedSecIds,
        common_branches: commonBranches // Additional branches to publish to
      };
      const res = await fetch("http://localhost:8000/api/admin/publish_semester", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        const targetBranch = `${buildDept}${buildBatchYear}`;
        const allBranches = [targetBranch, ...commonBranches].join(", ");
        toast({ description: `Published to branches: ${allBranches}` });
      }
      else { const e = await res.json(); toast({ description: e.detail, variant: "destructive" }); }
    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };

  const loadPrereqs = async (courseCode: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/prerequisites?course_code=${courseCode}`);
      const data = await res.json();
      setCoursePrereqs(data.prerequisites || []);
    } catch (e) { console.error(e); }
  };

  const addPrereq = async () => {
    if (!prereqCourse || !prereqTarget) return toast({ description: "Select both course and prerequisite!" });
    try {
      const res = await fetch("http://localhost:8000/api/admin/prerequisites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_code: prereqCourse, prerequisite_course_code: prereqTarget })
      });
      if (res.ok) {
        toast({ description: `Added ${prereqTarget} as prerequisite for ${prereqCourse}` });
        loadPrereqs(prereqCourse);
      } else {
        const e = await res.json();
        throw new Error(e.detail || "Failed");
      }
    } catch (e: any) { toast({ description: e.message, variant: "destructive" }); }
  };

  const removePrereq = async (prereq: string) => {
    if (!prereqCourse) return;
    try {
      const res = await fetch(
        `http://localhost:8000/api/admin/prerequisites?course_code=${prereqCourse}&prerequisite_course_code=${prereq}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast({ description: `Removed ${prereq}` });
        loadPrereqs(prereqCourse);
      }
    } catch (e: any) { toast({ description: e.message, variant: "destructive" }); }
  };

  const addCommonBranch = () => {
    if (!commonDept || !commonYear) return toast({ description: "Select department and year" });
    const branch = `${commonDept.toUpperCase()}${commonYear}`;
    if (commonBranches.includes(branch)) {
      return toast({ description: `${branch} already added!` });
    }
    setCommonBranches([...commonBranches, branch]);
    toast({ description: `Added ${branch} as common branch` });
  };

  // Live Calculations
  const metrics = useMemo(() => {
    let core = 0; let dept = 0; let inst = 0;
    termSections.filter(s => selectedSecIds.includes(s.section_id)).forEach(s => {
      if (s.course_type === 'Core') core += s.credits;
      if (s.course_type === 'Department Elective') dept += s.credits;
      if (s.course_type === 'Institute Elective') inst += s.credits;
    });
    return { core, dept, inst };
  }, [termSections, selectedSecIds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Admin Portal</h1>
      </div>

      <Tabs defaultValue="infra" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="infra">Global Infrastructure Hub</TabsTrigger>
          <TabsTrigger value="users">User Accounts & Programs</TabsTrigger>
          <TabsTrigger value="registry">Courses & Setup</TabsTrigger>
          <TabsTrigger value="builder">Semester Planner</TabsTrigger>
        </TabsList>

        {/* VIEW 1: INFRASTRUCTURE */}
        <TabsContent value="infra" className="space-y-6 mt-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle>Define Department</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Department ID</Label><Input placeholder="CSE" value={newDeptId} onChange={e=>setNewDeptId(e.target.value)} /></div>
                  <div><Label>Department Name</Label><Input placeholder="Computer Science" value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} /></div>
                  <Button variant="outline" className="w-full" onClick={saveDept}>Lock Department Rule</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Define Academic Term</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Term Tag ID</Label><Input placeholder="FALL-2026" value={newTermId} onChange={e=>setNewTermId(e.target.value)} /></div>
                  <div><Label>Display Name</Label><Input placeholder="Fall Semester 2026" value={newTermName} onChange={e=>setNewTermName(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                     <div><Label>Start Date</Label><Input type="date" value={newTermStart} onChange={e=>setNewTermStart(e.target.value)}/></div>
                     <div><Label>End Date</Label><Input type="date" value={newTermEnd} onChange={e=>setNewTermEnd(e.target.value)}/></div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={saveTerm}>Lock Term Blueprint</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Define Room / Facility</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Venue ID</Label><Input placeholder="LT-1" value={newVenueId} onChange={e=>setNewVenueId(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                     <div><Label>Building</Label><Input placeholder="Abhinandan" value={newBuildingName} onChange={e=>setNewBuildingName(e.target.value)} /></div>
                     <div><Label>Room No</Label><Input placeholder="A-101" value={newRoomNo} onChange={e=>setNewRoomNo(e.target.value)}/></div>
                  </div>
                  <div><Label>Physical Capacity Floor</Label><Input type="number" value={newRoomCap} onChange={e=>setNewRoomCap(Number(e.target.value))} /></div>
                  <Button variant="outline" className="w-full" onClick={saveVenue}>Lock Venue Asset</Button>
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* VIEW 1.5: USERS AND ROLES */}
        <TabsContent value="users" className="space-y-6 mt-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle>1. New Degree Program</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Program ID</Label><Input placeholder="BTECH-CSE" value={cpId} onChange={e=>setCpId(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                     <div><Label>Name</Label><Input placeholder="B.Tech" value={cpName} onChange={e=>setCpName(e.target.value)} /></div>
                     <div><Label>Spec.</Label><Input placeholder="AI" value={cpSpec} onChange={e=>setCpSpec(e.target.value)}/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <Label>Base Dept.</Label>
                       <Select value={cpDept} onValueChange={setCpDept}>
                          <SelectTrigger><SelectValue placeholder="Dept"/></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                          </SelectContent>
                       </Select>
                     </div>
                     <div><Label>Total Credits</Label><Input type="number" value={cpCredits} onChange={e=>setCpCredits(Number(e.target.value))}/></div>
                  </div>
                  <Button variant="default" className="w-full" onClick={saveProgram}>Define Pipeline</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>2. Register Professor</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Employee ID</Label><Input placeholder="FAC-CSE-007" value={profId} onChange={e=>setProfId(e.target.value)} /></div>
                  <div><Label>Full Name</Label><Input value={profName} onChange={e=>setProfName(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={profEmail} onChange={e=>setProfEmail(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <Label>Department</Label>
                       <Select value={profDept} onValueChange={setProfDept}>
                          <SelectTrigger><SelectValue placeholder="Dept"/></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                          </SelectContent>
                       </Select>
                     </div>
                     <div><Label>Designation</Label><Input value={profDesig} onChange={e=>setProfDesig(e.target.value)}/></div>
                  </div>
                  <Button variant="outline" className="w-full border-primary text-primary" onClick={saveProfessor}>Generate Employee</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>3. Register Student</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Roll Number</Label><Input placeholder="CSE2026045" value={stuId} onChange={e=>setStuId(e.target.value)} /></div>
                  <div><Label>Full Name</Label><Input value={stuName} onChange={e=>setStuName(e.target.value)} /></div>
                  <div><Label>Email Account</Label><Input type="email" value={stuEmail} onChange={e=>setStuEmail(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <Label>Degree Target</Label>
                       <Select value={stuProg} onValueChange={setStuProg}>
                          <SelectTrigger><SelectValue placeholder="Prog"/></SelectTrigger>
                          <SelectContent>
                            {programs.map(d => <SelectItem key={d.program_id} value={d.program_id}>{d.program_id}</SelectItem>)}
                          </SelectContent>
                       </Select>
                     </div>
                     <div><Label>Batch Year</Label><Input type="number" value={stuBatch} onChange={e=>setStuBatch(Number(e.target.value))}/></div>
                  </div>
                  <Button variant="default" className="w-full" onClick={saveStudent}>Issue ID Card</Button>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
        
        {/* VIEW 2: REGISTRY */}
        <TabsContent value="registry" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>1. Create New Base Course</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Course Code Suffix</Label>
                    <div className="flex">
                       <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md font-mono text-sm">{cDept || 'DEPT'}</div>
                       <Input className="rounded-l-none" placeholder="101" value={cCode} onChange={e=>setCCode(e.target.value)}/>
                    </div>
                  </div>
                  <div><Label>Course Name</Label><Input placeholder="Programming" value={cName} onChange={e=>setCName(e.target.value)}/></div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  <div><Label>Credits</Label><Input type="number" value={cCredits} onChange={e=>setCCredits(Number(e.target.value))}/></div>
                  <div><Label>L-T-P Hours</Label><Input placeholder="3-0-0" value={cLtp} onChange={e=>setCLtp(e.target.value)}/></div>
                  
                  <div>
                    <Label>Department</Label>
                    <Select value={cDept} onValueChange={setCDept}>
                       <SelectTrigger><SelectValue placeholder="Dropdown"/></SelectTrigger>
                       <SelectContent>
                         {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>

                  <div><Label>Semester No.</Label><Input type="number" value={cSemCode} onChange={e=>setCSemCode(Number(e.target.value))}/></div>
                  <div>
                      <Label>Course Type</Label>
                      <Select value={cType} onValueChange={setCType}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Core">Core</SelectItem>
                            <SelectItem value="Department Elective">Dept Elective</SelectItem>
                            <SelectItem value="Institute Elective">Inst Elective</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>
                <Button onClick={saveCourse} className="w-full">Create Base Course</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>2. Create Course Section</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Base Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger><SelectValue placeholder="Select existing base course blueprint"/></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.course_code} value={c.course_code}>{c.course_code} - {c.course_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assign Professor</Label>
                  <Select value={assignedProf} onValueChange={setAssignedProf}>
                    <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
                    <SelectContent>{professors.map(p => <SelectItem key={p.employee_id} value={p.employee_id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Semester Term</Label>
                    <Select value={secTerm} onValueChange={setSecTerm}>
                       <SelectTrigger><SelectValue placeholder="Dropdown"/></SelectTrigger>
                       <SelectContent>
                         {terms.map(t => <SelectItem key={t.term_id} value={t.term_id}>{t.term_name} ({t.term_id})</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section Name</Label>
                    <Input placeholder="A, B, or M1" value={secName} onChange={e=>setSecName(e.target.value)}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Venue (physical location)</Label>
                    <Select value={secVenue} onValueChange={setSecVenue}>
                       <SelectTrigger><SelectValue placeholder="Select Venue"/></SelectTrigger>
                       <SelectContent>
                         {venues.map(v => <SelectItem key={v.venue_id} value={v.venue_id}>{v.venue_id} - {v.building_name} (max {v.capacity})</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Enrollment Capacity</Label>
                    <Input type="number" placeholder="50" value={secCapacity} onChange={e=>setSecCapacity(Number(e.target.value))}/>
                    {secVenue && venues.find(v => v.venue_id === secVenue) && secCapacity > (venues.find(v => v.venue_id === secVenue)?.capacity || 0) && (
                      <p className="text-xs text-destructive mt-1">⚠ Exceeds venue capacity!</p>
                    )}
                  </div>
                </div>
                <Button onClick={createSection} className="w-full" variant="outline">Create Section (ID: {selectedCourse}-{secName})</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>3. Manage Prerequisites</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Course</Label>
                  <Select value={prereqCourse} onValueChange={(val) => { setPrereqCourse(val); loadPrereqs(val); }}>
                    <SelectTrigger><SelectValue placeholder="Choose course to manage"/></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.course_code} value={c.course_code}>{c.course_code} - {c.course_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {prereqCourse && (
                  <>
                    <div>
                      <Label>Add Prerequisite</Label>
                      <div className="flex gap-2">
                        <Select value={prereqTarget} onValueChange={setPrereqTarget}>
                          <SelectTrigger><SelectValue placeholder="Select prerequisite"/></SelectTrigger>
                          <SelectContent>{courses.filter(c => c.course_code !== prereqCourse).map(c => <SelectItem key={c.course_code} value={c.course_code}>{c.course_code}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={addPrereq} variant="outline">Add</Button>
                      </div>
                    </div>
                    <div>
                      <Label>Current Prerequisites</Label>
                      <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-3 border rounded-md">
                        {coursePrereqs.length === 0 && <span className="text-sm text-muted-foreground">No prerequisites</span>}
                        {coursePrereqs.map(p => (
                          <Badge key={p} variant="secondary" className="cursor-pointer" onClick={() => removePrereq(p)}>
                            {p} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle>4. Add Class Timetable</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2"><Label>Target Section ID</Label><Input placeholder="Section ID created above..." value={targetSecId} onChange={e=>setTargetSecId(e.target.value)}/></div>
                  <div className="col-span-2">
                    <Label>Room / Venue</Label>
                    <Select value={venue} onValueChange={setVenue}>
                       <SelectTrigger><SelectValue placeholder="Dropdown"/></SelectTrigger>
                       <SelectContent>
                         {venues.map(v => <SelectItem key={v.venue_id} value={v.venue_id}>{v.venue_id}</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Day of Week</Label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monday">Monday</SelectItem>
                        <SelectItem value="Tuesday">Tuesday</SelectItem>
                        <SelectItem value="Wednesday">Wednesday</SelectItem>
                        <SelectItem value="Thursday">Thursday</SelectItem>
                        <SelectItem value="Friday">Friday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label>Start Time</Label><Input type="time" step="2" value={stTime} onChange={e=>setStTime(e.target.value)}/></div>
                  <div className="col-span-2"><Label>End Time</Label><Input type="time" step="2" value={enTime} onChange={e=>setEnTime(e.target.value)}/></div>
                </div>
                <Button onClick={createSlot} variant="secondary" className="w-full">Add Timetable Slot</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* VIEW 3: SEMESTER BUILDER */}
        <TabsContent value="builder" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Branch-Wise Course Publishing</CardTitle>
              <CardDescription>Select branch (Department + Batch Year) and publish courses to that specific branch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                <div>
                  <Label className="text-base font-semibold">Branch Target</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label>Department</Label>
                      <Select value={buildDept} onValueChange={setBuildDept}>
                        <SelectTrigger><SelectValue placeholder="Select Dept"/></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Batch Year</Label>
                      <Input type="number" placeholder="2021" value={buildBatchYear} onChange={(e)=>setBuildBatchYear(Number(e.target.value))}/>
                    </div>
                  </div>
                  {buildDept && buildBatchYear && (
                    <p className="text-xs text-muted-foreground mt-2">Publishing for: <span className="font-mono font-bold text-primary">{buildDept}{buildBatchYear}</span> students</p>
                  )}
                </div>
                <div>
                  <Label className="text-base font-semibold">Semester Configuration</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label>Term</Label>
                      <Select value={buildTerm} onValueChange={setBuildTerm}>
                        <SelectTrigger><SelectValue placeholder="Select Term"/></SelectTrigger>
                        <SelectContent>
                          {terms.map(t => <SelectItem key={t.term_id} value={t.term_id}>{t.term_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Semester No.</Label>
                      <Input type="number" placeholder="6" value={buildSemCode} onChange={(e)=>setBuildSemCode(Number(e.target.value))}/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border p-4 rounded-md">
                 <div><Label>Required: Core Credits</Label><Input type="number" value={tgtCore} onChange={(e)=>setTgtCore(Number(e.target.value))}/></div>
                 <div><Label>Required: Dept Elective Cr</Label><Input type="number" value={tgtDept} onChange={(e)=>setTgtDept(Number(e.target.value))}/></div>
                 <div><Label>Required: Inst Elective Cr</Label><Input type="number" value={tgtInst} onChange={(e)=>setTgtInst(Number(e.target.value))}/></div>
              </div>
              <Button onClick={fetchTermSections} className="w-full">Fetch Available Courses from Term</Button>
            </CardContent>
          </Card>

          {termSections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <Card>
                   <CardHeader className="flex flex-row space-y-0 justify-between items-center">
                       <CardTitle>Select Courses for Branch</CardTitle>
                       <div className="flex gap-2 items-center">
                         <Select value={termPoolFilter} onValueChange={setTermPoolFilter}>
                            <SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Types</SelectItem>
                                <SelectItem value="Core">Core</SelectItem>
                                <SelectItem value="Department Elective">Dept Elective</SelectItem>
                                <SelectItem value="Institute Elective">Inst Elective</SelectItem>
                            </SelectContent>
                         </Select>
                         <Select value={termDeptFilter} onValueChange={setTermDeptFilter}>
                           <SelectTrigger className="w-[100px]"><SelectValue/></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="All">All Depts</SelectItem>
                             {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                           </SelectContent>
                         </Select>
                       </div>
                   </CardHeader>
                   <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                     {termSections.filter(sec => {
                       if (termPoolFilter !== "All" && sec.course_type !== termPoolFilter) return false;
                       if (termDeptFilter !== "All" && sec.department_id !== termDeptFilter) return false;
                       return true;
                     }).map((sec) => (
                       <div key={sec.section_id} onClick={() => toggleSection(sec)} className={`p-4 border rounded-md cursor-pointer transition-colors ${selectedSecIds.includes(sec.section_id) ? 'bg-primary/20 border-primary' : 'bg-background hover:bg-muted'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                               <h3 className="font-semibold">{sec.course_code}: {sec.course_name}</h3>
                               <p className="text-sm text-muted-foreground">Type: {sec.course_type} | Dept: {sec.department_id}</p>
                               {sec.prerequisites && sec.prerequisites.length > 0 && (
                                 <div className="mt-2 flex flex-wrap gap-1">
                                   <span className="text-xs text-muted-foreground">Prerequisites:</span>
                                   {sec.prerequisites.map((p: string) => (
                                     <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                   ))}
                                 </div>
                               )}
                            </div>
                            <div className="text-right ml-3">
                               <Badge>{sec.credits} Credits</Badge>
                               <p className="text-xs text-muted-foreground mt-1">LTP: {sec.ltp}</p>
                            </div>
                          </div>
                       </div>
                     ))}
                   </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Credit Requirements Check</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Common Branches (Cross-Dept Access)</Label>
                      <div className="flex flex-wrap gap-2 mb-3 p-3 border rounded-md min-h-[60px]">
                        {commonBranches.length === 0 && <span className="text-xs text-muted-foreground">No common branches — courses will only be published to {buildDept}{buildBatchYear}</span>}
                        {commonBranches.map(b => (
                          <Badge key={b} variant="secondary" className="cursor-pointer" onClick={() => setCommonBranches(commonBranches.filter(x => x !== b))}>
                            {b} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={commonDept} onValueChange={setCommonDept}>
                          <SelectTrigger><SelectValue placeholder="Dept"/></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d.department_id} value={d.department_id}>{d.department_id}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Year" value={commonYear} onChange={(e) => setCommonYear(Number(e.target.value))} />
                        <Button onClick={addCommonBranch} variant="outline" size="sm">Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Core Credits</Label>
                      <div className="flex justify-between"><span className="text-sm">Accumulated: {metrics.core}</span><span className="text-sm">Target: {tgtCore}</span></div>
                      <div className={`h-2 rounded w-full ${metrics.core >= tgtCore ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${Math.min((metrics.core / (tgtCore || 1)) * 100, 100)}%`}}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Department Elective Credits</Label>
                      <div className="flex justify-between"><span className="text-sm">Accumulated: {metrics.dept}</span><span className="text-sm">Target: {tgtDept}</span></div>
                      <div className={`h-2 rounded w-full ${metrics.dept >= tgtDept ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${Math.min((metrics.dept / (tgtDept || 1)) * 100, 100)}%`}}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Institute Elective Credits</Label>
                      <div className="flex justify-between"><span className="text-sm">Accumulated: {metrics.inst}</span><span className="text-sm">Target: {tgtInst}</span></div>
                      <div className={`h-2 rounded w-full ${metrics.inst >= tgtInst ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${Math.min((metrics.inst / (tgtInst || 1)) * 100, 100)}%`}}/>
                    </div>
                  </CardContent>
                </Card>
                
                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={publishSemester} disabled={!buildDept || !buildBatchYear}>
                  Publish to {buildDept}{buildBatchYear} Branch
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
