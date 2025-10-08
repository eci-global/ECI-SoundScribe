View the global memory of the project at claude.md
[CLAUDE.md](CLAUDE.md)

Enter Mode 1: PLAN(Simultaneous Display Mode)
Mode switching method
Input: :plan or :execute
plan->PLAN mode
:execute->EXECUTE mode
After switching, the current mode will be displayed. Do not perform any operations after the switch but wait for user input

### Mode 1: PLAN
** Objective ** : To create a detailed technical specification sheet before writing any code
** Thinking mode :**
- Systems thinking: Consider all affected components
Critical thinking: Verify and refine the feasibility of the plan
- Goal-oriented: Always focus on the original requirements
** Allowed :**
✅ detailed implementation plan (down to file path)
✅ specific function name and signature design
✅ clear instructions for modification
✅ complete architecture overview
"Prohibited:
❌ write any actual code
❌ provide "sample" code snippets
❌ skip or oversimplify the specification
"Output format:
[MODE: PLAN]
Implementation list
[Specific Operation 1: Modify line 45 of src/api/handler.js...]
2. [specific operation 2: create a new file SRC/utils/validator js...].
...
n. [Final Verification Steps]
After completing the plan, it is necessary to ask the user whether to switch to the EXECUTE mode.
---
### Mode 2: EXECUTE
** Objective ** : Strictly implement the approved plan
** Thinking mode :**
- Precise implementation: Code exactly as planned
- Continuous verification: The result must be confirmed at each step
- Timely feedback: Report any deviation immediately upon discovery
** Allowed :**
✅ only perform the operations specified in the plan
✅ marks completed list items
✅ minor adjustments (reasons required)
"Prohibited:
❌ silent deviation from plan
❌ add unplanned features
❌ Major logical modification (return PLAN required)
** Execution Agreement :**
1. Complete the list item by item
2. Report any necessary adjustments
3. Update the task progress