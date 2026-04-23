export const studentProfile = {
  name: "Arjun Sharma",
  rollNo: "CSE2021045",
  department: "Computer Science & Engineering",
  programme: "B.Tech",
  batch: "2021-2025",
  semester: 6,
  email: "cse2021045@iiti.ac.in",
  phone: "+91 98765 43210",
  dob: "15 March 2003",
  bloodGroup: "B+",
  address: "45, MG Road, Bhopal, Madhya Pradesh - 462001",
  guardian: "Mr. Rajesh Sharma",
  guardianPhone: "+91 91234 56789",
  cgpa: 8.42,
  avatar: "",
};

export const professorProfile = {
  name: "Dr. Meera Nair",
  employeeId: "FAC-CSE-017",
  department: "Computer Science & Engineering",
  designation: "Associate Professor",
  email: "meera.nair@iiti.ac.in",
  phone: "+91 99887 66554",
  office: "CSE Block, Room 312",
  specialization: "Machine Learning, AI Systems, Data Mining",
};

export const publicTimetable = [
  { day: "Monday", slot: "08:30 - 10:00", title: "CS302 Computer Networks", venue: "LH-201" },
  { day: "Monday", slot: "10:00 - 11:30", title: "CS301 Machine Learning", venue: "LH-105" },
  { day: "Tuesday", slot: "14:00 - 15:30", title: "EE301 Digital Signal Processing", venue: "LH-301" },
  { day: "Wednesday", slot: "10:00 - 11:30", title: "CS301 Machine Learning", venue: "LH-105" },
  { day: "Thursday", slot: "16:00 - 17:00", title: "MA301 Probability & Statistics Tutorial", venue: "LH-110" },
  { day: "Friday", slot: "10:00 - 13:00", title: "CS351 ML Lab", venue: "Lab Complex 2" },
];

export const notifications = [
  { id: "n1", title: "Mid-semester evaluation window opens", category: "Academic", date: "09 Apr 2026", body: "Students can review course evaluation forms from the portal until 15 Apr 2026." },
  { id: "n2", title: "Summer internship document verification", category: "Placement", date: "07 Apr 2026", body: "Upload offer letters and faculty approvals before the verification deadline." },
  { id: "n3", title: "Research colloquium this Friday", category: "Research", date: "05 Apr 2026", body: "All PG and PhD scholars are encouraged to attend the departmental colloquium at 3 PM." },
];

export const professorCourses = [
  {
    id: "pc1",
    code: "CS301",
    name: "Machine Learning",
    semester: "Spring 2026",
    section: "A",
    schedule: "Mon/Wed 10:00 - 11:30",
    students: 58,
    attendanceUploads: [
      { name: "attendance-week-05.pdf", uploadedOn: "02 Apr 2026", status: "Verified" },
      { name: "attendance-week-06.pdf", uploadedOn: "08 Apr 2026", status: "Pending Review" },
    ],
    markUploads: [
      { name: "midsem-marks.xlsx", uploadedOn: "01 Apr 2026", status: "Published" },
    ],
  },
  {
    id: "pc2",
    code: "CS401",
    name: "Deep Learning",
    semester: "Spring 2026",
    section: "B",
    schedule: "Tue/Thu 11:30 - 13:00",
    students: 34,
    attendanceUploads: [
      { name: "attendance-week-04.pdf", uploadedOn: "31 Mar 2026", status: "Verified" },
    ],
    markUploads: [
      { name: "quiz-1-grades.xlsx", uploadedOn: "06 Apr 2026", status: "Draft" },
      { name: "assignment-2-grades.xlsx", uploadedOn: "08 Apr 2026", status: "Published" },
    ],
  },
];

export const researchStudents = [
  {
    id: "rs1",
    name: "Neha Verma",
    scholarId: "PHD-CSE-2023-04",
    programme: "PhD",
    email: "neha.verma@iiti.ac.in",
    phone: "+91 98765 11001",
    topic: "Robust Federated Learning for Edge Devices",
    domain: "Distributed ML",
    year: "3rd Year",
    status: "Comprehensive exam completed",
  },
  {
    id: "rs2",
    name: "Rahul Menon",
    scholarId: "MSR-CSE-2024-09",
    programme: "MS (Research)",
    email: "rahul.menon@iiti.ac.in",
    phone: "+91 98765 11002",
    topic: "Explainable Vision Models for Smart Campus Monitoring",
    domain: "Computer Vision",
    year: "2nd Year",
    status: "Thesis proposal under review",
  },
];

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  instructor: string;
  department: string;
  schedule: string;
  semester: number;
  type: "core" | "elective" | "lab";
  mode: "graded" | "audit";
  seats: number;
  registered: number;
}

export const availableCourses: Course[] = [
  { id: "1", code: "CS301", name: "Machine Learning", credits: 4, instructor: "Dr. Ananya Mishra", department: "CSE", schedule: "Mon/Wed 10:00-11:30", semester: 6, type: "core", mode: "graded", seats: 60, registered: 52 },
  { id: "2", code: "CS302", name: "Computer Networks", credits: 4, instructor: "Dr. Vikram Patel", department: "CSE", schedule: "Tue/Thu 14:00-15:30", semester: 6, type: "core", mode: "graded", seats: 60, registered: 58 },
  { id: "3", code: "CS303", name: "Compiler Design", credits: 3, instructor: "Dr. Suman Das", department: "CSE", schedule: "Mon/Wed 14:00-15:00", semester: 6, type: "core", mode: "graded", seats: 60, registered: 45 },
  { id: "4", code: "CS351", name: "ML Lab", credits: 2, instructor: "Dr. Ananya Mishra", department: "CSE", schedule: "Fri 10:00-13:00", semester: 6, type: "lab", mode: "graded", seats: 30, registered: 28 },
  { id: "5", code: "CS361", name: "Natural Language Processing", credits: 3, instructor: "Dr. Priya Singh", department: "CSE", schedule: "Tue/Thu 10:00-11:00", semester: 6, type: "elective", mode: "graded", seats: 40, registered: 35 },
  { id: "6", code: "CS362", name: "Information Retrieval", credits: 3, instructor: "Dr. Amit Jain", department: "CSE", schedule: "Wed/Fri 14:00-15:00", semester: 6, type: "elective", mode: "audit", seats: 40, registered: 12 },
  { id: "7", code: "EE301", name: "Digital Signal Processing", credits: 3, instructor: "Dr. Neha Gupta", department: "EE", schedule: "Mon/Wed 08:30-10:00", semester: 6, type: "elective", mode: "audit", seats: 50, registered: 22 },
  { id: "8", code: "MA301", name: "Probability & Statistics", credits: 4, instructor: "Dr. Ravi Kumar", department: "MATH", schedule: "Tue/Thu 08:30-10:00", semester: 7, type: "core", mode: "graded", seats: 80, registered: 40 },
  { id: "9", code: "CS401", name: "Deep Learning", credits: 4, instructor: "Dr. Ananya Mishra", department: "CSE", schedule: "Mon/Wed 10:00-11:30", semester: 7, type: "elective", mode: "graded", seats: 40, registered: 38 },
  { id: "10", code: "CS402", name: "Distributed Systems", credits: 3, instructor: "Dr. Vikram Patel", department: "CSE", schedule: "Tue/Thu 14:00-15:00", semester: 7, type: "elective", mode: "graded", seats: 40, registered: 30 },
];

export const registeredCourseIds = ["1", "2", "3", "4", "5"];

export interface SemesterResult {
  semester: number;
  year: string;
  sgpa: number;
  courses: { code: string; name: string; credits: number; grade: string; points: number }[];
}

export const results: SemesterResult[] = [
  {
    semester: 1, year: "2021-22", sgpa: 8.2,
    courses: [
      { code: "MA101", name: "Calculus", credits: 4, grade: "AB", points: 9 },
      { code: "PH101", name: "Physics I", credits: 4, grade: "BB", points: 8 },
      { code: "CS101", name: "Intro to Programming", credits: 4, grade: "AA", points: 10 },
      { code: "EE101", name: "Basic Electrical Engg.", credits: 3, grade: "AB", points: 9 },
      { code: "HS101", name: "English Communication", credits: 2, grade: "BB", points: 8 },
      { code: "CS151", name: "Programming Lab", credits: 2, grade: "AA", points: 10 },
    ],
  },
  {
    semester: 2, year: "2021-22", sgpa: 8.5,
    courses: [
      { code: "MA102", name: "Linear Algebra", credits: 4, grade: "AA", points: 10 },
      { code: "PH102", name: "Physics II", credits: 4, grade: "AB", points: 9 },
      { code: "CS102", name: "Data Structures", credits: 4, grade: "AB", points: 9 },
      { code: "ME101", name: "Engineering Drawing", credits: 3, grade: "BB", points: 8 },
      { code: "CH101", name: "Chemistry", credits: 3, grade: "BC", points: 7 },
      { code: "CS152", name: "DS Lab", credits: 2, grade: "AA", points: 10 },
    ],
  },
  {
    semester: 3, year: "2022-23", sgpa: 8.6,
    courses: [
      { code: "CS201", name: "Algorithms", credits: 4, grade: "AA", points: 10 },
      { code: "CS202", name: "Operating Systems", credits: 4, grade: "AB", points: 9 },
      { code: "CS203", name: "Discrete Mathematics", credits: 3, grade: "AB", points: 9 },
      { code: "MA201", name: "Differential Equations", credits: 4, grade: "BB", points: 8 },
      { code: "CS251", name: "OS Lab", credits: 2, grade: "AA", points: 10 },
    ],
  },
  {
    semester: 4, year: "2022-23", sgpa: 8.3,
    courses: [
      { code: "CS204", name: "Database Systems", credits: 4, grade: "AB", points: 9 },
      { code: "CS205", name: "Computer Architecture", credits: 4, grade: "BB", points: 8 },
      { code: "CS206", name: "Theory of Computation", credits: 3, grade: "AB", points: 9 },
      { code: "HS201", name: "Economics", credits: 3, grade: "BB", points: 8 },
      { code: "CS252", name: "DBMS Lab", credits: 2, grade: "AA", points: 10 },
    ],
  },
  {
    semester: 5, year: "2023-24", sgpa: 8.7,
    courses: [
      { code: "CS301", name: "Machine Learning", credits: 4, grade: "AA", points: 10 },
      { code: "CS302", name: "Computer Networks", credits: 4, grade: "AB", points: 9 },
      { code: "CS303", name: "Software Engineering", credits: 3, grade: "AB", points: 9 },
      { code: "CS361", name: "NLP", credits: 3, grade: "BB", points: 8 },
      { code: "CS351", name: "ML Lab", credits: 2, grade: "AA", points: 10 },
    ],
  },
];

export const attendanceData = [
  { code: "CS301", name: "Machine Learning", total: 42, attended: 38, percentage: 90.5 },
  { code: "CS302", name: "Computer Networks", total: 40, attended: 35, percentage: 87.5 },
  { code: "CS303", name: "Compiler Design", total: 38, attended: 30, percentage: 78.9 },
  { code: "CS351", name: "ML Lab", total: 14, attended: 13, percentage: 92.9 },
  { code: "CS361", name: "NLP", total: 36, attended: 24, percentage: 66.7 },
];

export const feeData = {
  semester: "Spring 2024 (Semester 6)",
  dueDate: "15 Jan 2024",
  items: [
    { description: "Tuition Fee", amount: 100000, status: "paid" as const },
    { description: "Hostel Fee", amount: 15000, status: "paid" as const },
    { description: "Mess Advance", amount: 18000, status: "pending" as const },
    { description: "Examination Fee", amount: 2000, status: "paid" as const },
    { description: "Student Activity Fee", amount: 1500, status: "pending" as const },
    { description: "Medical Insurance", amount: 3000, status: "paid" as const },
    { description: "Library Fee", amount: 1000, status: "paid" as const },
    { description: "Internet & IT Fee", amount: 2500, status: "paid" as const },
  ],
};

export const uploadedDocuments = [
  { id: "1", name: "Aadhar Card.pdf", type: "ID Proof", uploadDate: "10 Aug 2021", status: "verified" as const, size: "1.2 MB" },
  { id: "2", name: "12th Marksheet.pdf", type: "Academic", uploadDate: "10 Aug 2021", status: "verified" as const, size: "850 KB" },
  { id: "3", name: "Passport Photo.jpg", type: "Photo", uploadDate: "12 Aug 2021", status: "verified" as const, size: "120 KB" },
  { id: "4", name: "Income Certificate.pdf", type: "Financial", uploadDate: "05 Sep 2023", status: "pending" as const, size: "2.1 MB" },
];
