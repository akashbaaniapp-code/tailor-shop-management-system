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

---
Task ID: entity-selection-no-all-entities
Agent: main
Task: Remove "All Entities" overview option from entity selection page. Every user (including admin) should see ONLY the entities assigned to them via UserPermission rows. Admin no longer auto-gets all entities — assignment-based access for everyone. Lockout fallback for users with zero permission rows.

Work Log:
- Read EntitySelection.tsx — confirmed it had an "All Entities" button shown for admins, and a selection state type that included 'all'.
- Read /api/auth/login/route.ts and /api/auth/me/route.ts — confirmed admin branch auto-populated accessibleEntities/accessibleSubEntities with ALL entities from DB.
- Updated /api/auth/login/route.ts:
  * Removed the `user.role === 'admin'` branch that returned all entities.
  * New logic: every user (admin or not) sees only entities whose IDs appear in their UserPermission.entityIds / subEntityIds arrays.
  * Lockout fallback: if a user has zero UserPermission rows at all (e.g. freshly seeded admin with no permissions yet), fall back to showing all entities so they can still log in.
- Updated /api/auth/me/route.ts with identical logic (so the page-refresh revalidation matches login).
- Updated EntitySelection.tsx:
  * Removed the Globe icon import (no longer needed).
  * Removed `handleSelectAll` function and `isAdmin` variable.
  * Removed the entire "All Entities" overview card UI (admin-only block).
  * Simplified selection state type from `'all' | 'entity' | 'subEntity'` to `'entity' | 'subEntity'`.
  * Updated welcome message — removed the admin-specific "or choose All Entities" text.
  * Updated selection summary text — removed the "All Entities (Admin Overview)" option.
  * Updated empty-state hint — same message for everyone now.
- Updated AppShell.tsx — the entity-switch button's fallback text changed from "All Entities" to "Select Entity" (just a display label; users always have an entity selected after entering).
- Ran `npx tsc --noEmit` — no type errors from any of the changed files.
- Verified no leftover `isAdmin`, `handleSelectAll`, or `type: 'all'` references in EntitySelection.tsx.

Stage Summary:
- "All Entities" overview option is fully removed from the entity selection page.
- All users (admin, manager, staff) see ONLY entities explicitly assigned via UserPermission rows.
- Existing permission multi-select system (entityIds + subEntityIds arrays) already supports assigning main entity OR sub-entity in any combination — no further schema changes needed.
- Lockout protection: users with zero permission rows (e.g. default seeded admin) still see all entities so they're never locked out of the system.
- Files updated:
  * /home/z/my-project/src/app/api/auth/login/route.ts
  * /home/z/my-project/src/app/api/auth/me/route.ts
  * /home/z/my-project/src/components/EntitySelection.tsx
  * /home/z/my-project/src/components/AppShell.tsx
