# Upgrade better-auth to Latest Version

## Goal
Upgrade the better-auth package from version ^1.3.34 to the latest version, ensuring all authentication functionality continues to work correctly across the application.

## Scope
**Will change:**
- `package.json` - better-auth version
- `pnpm-lock.yaml` - updated lockfile
- Potentially `lib/auth.ts`, `lib/auth-client.ts`, and `app/api/auth/[...all]/route.ts` if there are breaking API changes

**Will NOT change:**
- Database schema (better-auth schema is already defined in `lib/db/schema.ts`)
- Authentication providers configuration (unless required by breaking changes)
- UI components in `components/auth/`

## Steps
1. Check the latest better-auth version and changelog for breaking changes:
   - Run `pnpm view better-auth versions` to see available versions
   - Review the [better-auth changelog](https://github.com/better-auth/better-auth/releases) for breaking changes between 1.3.34 and latest

2. Update the better-auth package:

## Guidelines
- Read files before modifying them
- Make incremental changes
- Use `editFile` for small changes instead of rewriting entire files
- Verify changes work before moving on