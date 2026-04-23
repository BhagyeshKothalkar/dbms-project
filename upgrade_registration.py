import re

with open('iit-indore-student-hub/src/pages/CourseRegistration.tsx', 'r') as f:
    text = f.read()

# Add useToast
if 'useToast' not in text:
    text = text.replace(
        'import { useState, useMemo, useEffect } from "react";',
        'import { useState, useMemo, useEffect } from "react";\nimport { useToast } from "@/hooks/use-toast";'
    )
    text = text.replace(
        'export default function CourseRegistration() {',
        'export default function CourseRegistration() {\n  const [isLocked, setIsLocked] = useState(false);\n  const { toast } = useToast();'
    )

# Extract locked flag from registered courses
text = text.replace(
    'setRegistered(new Set(dataReg.registeredCourseIds || []));',
    'setRegistered(new Set(dataReg.registeredCourseIds || []));\n        setIsLocked(dataReg.locked || false);'
)

# Convert alert -> toast
text = re.sub(
    r'alert\("([^"]+)"\)',
    r'toast({ description: "\1", variant: "destructive" })',
    text
)
text = text.replace(
    'alert(err.detail);',
    'toast({ description: err.detail, variant: "destructive" });'
)

# Inject lock function
lock_func = """
  const lockRegistration = async () => {
    const userId = window.localStorage.getItem("iit-userId") || "CSE2021045";
    try {
      const res = await fetch("http://localhost:8000/api/courses/lock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: userId })
      });
      if (res.ok) {
        setIsLocked(true);
        toast({ description: "Registration Successfully Locked!" });
      } else {
        const err = await res.json();
        toast({ description: err.detail, variant: "destructive" });
      }
    } catch (e: any) { toast({ description: e.message || String(e), variant: "destructive" }); }
  };
"""

text = text.replace(
    '  // Live Timetable Parse Logic',
    f'{lock_func}\n  // Live Timetable Parse Logic'
)

# Render Locked buttons in Table
old_action_col = """                            <TableCell>
                              {isCore && isReg ? (
                                  <Button size="sm" variant="secondary" className="h-7 cursor-not-allowed" disabled>
                                     <Lock className="h-3 w-3 mr-1" /> Locked
                                  </Button>
                              ) : (
                                  <Button size="sm" variant={isReg ? "destructive" : "default"} className="h-7 text-xs" onClick={() => toggle(c.id, c.type)}>
                                    {isReg ? <><Minus className="h-3 w-3 mr-1" /> Drop</> : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                                  </Button>
                              )}
                            </TableCell>"""

new_action_col = """                            <TableCell>
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
                            </TableCell>"""

text = text.replace(old_action_col, new_action_col)


# Disable drops in Badge list
old_badge = """                          {!c.type.includes('Core') && (
                             <button onClick={() => toggle(c.id, c.type)} className="hover:text-destructive transition-colors"><Minus className="h-3 w-3" /></button>
                          )}"""
new_badge = """                          {!c.type.includes('Core') && !isLocked && (
                             <button onClick={() => toggle(c.id, c.type)} className="hover:text-destructive transition-colors"><Minus className="h-3 w-3" /></button>
                          )}"""
text = text.replace(old_badge, new_badge)

# Append Lock Registration button to right column Summary Card
old_summary_card = """                      {regCourses.length === 0 && <span className="text-sm text-muted-foreground">Empty Pipeline.</span>}
                    </div>
                </CardContent>"""

new_summary_card = """                      {regCourses.length === 0 && <span className="text-sm text-muted-foreground">Empty Pipeline.</span>}
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
                </CardContent>"""

text = text.replace(old_summary_card, new_summary_card)

with open('iit-indore-student-hub/src/pages/CourseRegistration.tsx', 'w') as f:
    f.write(text)
