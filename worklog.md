---
Task ID: setup-dark-theme-expense-head-users
Agent: main
Task: Apply dark glassmorphism theme to SetupExpenseHead.tsx and SetupUsers.tsx matching user-provided HTML mockups (cards #14161a bg / #2a2d33 border, green Add button, dark table with colored action icons, role pill badges, blue usernames).

Work Log:
- Read existing SetupExpenseHead.tsx — was already mostly dark; refined padding to 25px on cards, 14px/10px in table cells, 25px left/right edge padding on first/last columns, right-aligned Action column, larger 15px gap between action icons to match mockup exactly.
- Read existing SetupUsers.tsx — was still using light Tailwind theme (slate-* shadcn components). Completely rewrote it in inline-style dark theme matching the mockup:
  * Control card: dark bg with three role badges (Admin #1db954, Manager #3498db, Staff #d4df3a) each with colored dot + description text, green Add User button.
  * Data table: dark header #1f2227, blue (#3498db) usernames, white names, pill badges for role with colored borders, muted created date, "Permissions" pill button with check-circle icon (shown only for non-admin), edit/delete icons with colored hover.
  * Permissions editor dialog: kept as modal (complex UI). Refactored from shadcn Card/Checkbox to inline dark theme — #0b0d0f nested cards, #d4df3a accent checkboxes, dashed "Add Another Permission Set" button, green Save button.
- Ran tsc --noEmit: no errors from the updated files (pre-existing errors in scripts/, skills/, and src/lib/db.ts are unrelated).
- Files updated:
  * /home/z/my-project/src/components/views/SetupExpenseHead.tsx
  * /home/z/my-project/src/components/views/SetupUsers.tsx

Stage Summary:
- Expense Heads page now matches the user's HTML mockup exactly (layout, padding, colors, action icon spacing).
- Users & Access Rights page fully converted from light Tailwind theme to dark glassmorphism, including role pill badges, blue usernames, permissions pill button, and dark-themed permissions editor dialog with lime-accent checkboxes.
- Both files type-check clean.
- Remaining dark-theme conversion work (not in this task): SetupUom, SetupCustomer, SetupDeliveryInfo, SetupEntity, UserFormPage, and all Report* views.
