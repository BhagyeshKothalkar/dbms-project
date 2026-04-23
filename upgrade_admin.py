import re

with open('iit-indore-student-hub/src/pages/AdminPortal.tsx', 'r') as f:
    text = f.read()

# 1. Add hook import
if "useToast" not in text:
    text = text.replace(
        'import { useState, useEffect, useMemo } from "react";',
        'import { useState, useEffect, useMemo } from "react";\nimport { useToast } from "@/hooks/use-toast";'
    )

    text = text.replace(
        'export default function AdminPortal() {',
        'export default function AdminPortal() {\n  const { toast } = useToast();'
    )

# Fix fetch handling logic for all simple saves
for func in ['saveDept', 'saveTerm', 'saveVenue', 'saveProgram', 'saveProfessor', 'saveStudent']:
    # Replace single line `if (res.ok) alert(...);` with full check
    text = re.sub(
        r'(const ' + func + r' = async \(\) => \{.+?)(if \(res\.ok\) \{? alert\([^;]+\); [^\}]+ \}?)(.+?\})',
        r'\g<1>if (res.ok) { \g<2> }\n      else { const e = await res.json(); throw new Error(e.detail || "Server Error"); }\n\g<3>',
        text,
        flags=re.DOTALL
    )

# Now standardise ALERTS -> TOASTS

# 1. Double quote descriptions
text = re.sub(
    r'alert\("([^"]+)"\)',
    r'toast({ description: "\1" })',
    text
)

# 2. Backtick descriptions
text = re.sub(
    r'alert\(`([^`]+)`\)',
    r'toast({ description: `\1` })',
    text
)

# 3. e.detail or variable descriptions
text = re.sub(
    r'alert\("Error: " \+ ([^)]+)\)',
    r'toast({ description: \1, variant: "destructive" })',
    text
)

# 4. catch(e) -> toast
text = re.sub(
    r'catch( *)\(([^)]+)\) \{ alert\(\2\); \}',
    r'catch\1(\2: any) { toast({ description: \2.message || String(\2), variant: "destructive" }); }',
    text
)

text = re.sub(
    r'return alert\(([^)]+)\)',
    r'return toast({ description: \1, variant: "destructive" })',
    text
)

with open('iit-indore-student-hub/src/pages/AdminPortal.tsx', 'w') as f:
    f.write(text)
