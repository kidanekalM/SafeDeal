# SafeDeal English i18n Completion TODO

## Current Progress: 0/8 [⬜⬜⬜⬜⬜⬜⬜⬜]

### 1. ✅ Create this TODO.md (track progress)

### 2. ✅ Read key files: pages/LandingPage.tsx, components/Layout.tsx, pages/AuthPage.tsx, components/AuthForm.tsx, pages/Dashboard.tsx
   - Use read_file on them.

### 3. ✅ Extract & identify ALL missing keys from user output + files
   - Compile list: pages.why_safedeal, pages.how_it_works, etc. (~100 keys)
   - Create/update en.json with complete English translations.

### 4. ✅ Update locales/en.json
   - Add all missing pages.*, components.* keys with proper English.
   - Match Amharic structure.

### 5. ✅ Fix hardcoded strings → t() calls
   - components/AuthForm.tsx: tabs, labels, buttons.
   - pages/AuthPage.tsx: Back to Home.
   - pages/LandingPage.tsx: All hardcoded home content.

### 6. [⬜] Update other pages/components
   - pages/Dashboard.tsx (minor).
   - Layout.tsx, etc. if needed.

### 7. [⬜] Test
   - cd Frontend && npm run dev
   - Set localStorage lang='en', test /, /auth, /dashboard.
   - Check no raw keys show.

### 8. [⬜] Final verification & attempt_completion

**Notes**: Use fallbacks from extraction as English values. Ensure exact key matches (e.g., 'pages.why_safedeal').

Updated after each step.

