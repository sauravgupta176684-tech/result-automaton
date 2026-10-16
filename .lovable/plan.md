# Secure teacher sign-in and result editing

## Build
- Create an email/password sign-in and account creation screen; keep new and returning users blocked from result pages until authenticated and through their required first password change.
- Use the existing teacher account `gauravgupta1766@gmail.com`; ensure other accounts receive read-only access.
- Store the password-change requirement with the protected account role, update the teacher password through a server-only auth operation, and clear the requirement only after the password update succeeds.
- Move result-state persistence behind Lovable Cloud so role checks protect actual saved marks and student records, not just visible controls. Allow authenticated users to read results after onboarding; allow only the designated teacher to save changes.
- Replace local-only write paths with authenticated Cloud reads/writes and retain the existing instant editing experience, exports, and English/Hindi language switch.
- Validate the login screen, first-login flow, result access, write protection, and current build.

## Technical details
- Add Cloud schema/RLS via the Lovable Database migration tool; no client-supplied role or local storage flag will grant edit access.
- Use protected TanStack server functions for Cloud state access and the forced password update. Keep the public sign-in page free of authenticated loaders.
