/** Primary admin account: full nav everywhere when logged in with this email */
export const SUPER_ADMIN_EMAIL = 'admin@petmatch.com'

export function isSuperAdminAccount(user) {
  if (!user?.email) return false
  return user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}
