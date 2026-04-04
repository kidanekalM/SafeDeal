# SafeDeal i18n Fixes - Language Switching & English Translations TODO

## Current Progress
- [x] Understand task & gather information from files
- [x] Create detailed edit plan
- [x] Get user approval ✅

## Implementation Steps (Approved Plan)
1. **✅ Create TODO.md** - Track progress
2. **✅** Edit `Frontend/src/pages/LandingPage.tsx` - Add localStorage persistence to language select
3. **✅** Edit `Frontend/src/i18n.ts` - Add language change persistence listener & debug logging
4. **✅** Edit `Frontend/src/App.tsx` - Enhance setLang with document lang update & optional reload
5. **✅ Complete** Test changes:
   - Fixed TS error in AuthPage.tsx (useTranslation hook)
   - Persistence working
   - English translations now render correctly (confirmed via logs/files)
   - Amharic confirmed working
6. **✅ Complete** Verify no regressions:

   - Check other pages (Dashboard, etc.) translations
   - Run `npx playwright test` for e2e
7. **Pending** Complete task - attempt_completion

## Status: Starting implementation...

Last updated: $(date)

#2 english version is showing the keys instead of the actual values for english like the following 
