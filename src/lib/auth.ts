/**
 * Login has been removed — the app is open access and fully editable.
 * These helpers stay so existing pages keep working without a session.
 */

export type AppRole = "teacher" | "viewer";

const localUser = { email: "teacher@local", id: "local-teacher" };

export const auth = {
  get: () => ({ session: null, user: localUser, role: "teacher" as AppRole, loading: false }),
  async signOut() {
    /* no-op: login removed */
  },
};

export function useAuth() {
  return auth.get();
}

/** Current user placeholder (has `.email`). */
export function useSession() {
  return localUser;
}

/** Login removed — everyone has full edit access. */
export function useIsTeacher(): boolean {
  return true;
}
