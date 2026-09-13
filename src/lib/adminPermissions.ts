import type { AdminRole, Profile } from './types'

// Mirrors the server-side checks in has_admin_role()/can_adjust_tokens()
// (supabase/schema.sql). This is UI-only convenience — every RPC re-checks
// permissions itself, so getting this wrong client-side fails safe (a
// hidden/disabled button, never an unauthorized action).
type RoleSource = Pick<Profile, 'is_admin' | 'admin_role' | 'token_permission_expires_at'> | null | undefined

export function hasAdminRole(profile: RoleSource, roles: AdminRole[]): boolean {
  if (!profile?.is_admin || !profile.admin_role) return false
  return roles.includes(profile.admin_role)
}

export function canModerate(profile: RoleSource): boolean {
  return hasAdminRole(profile, ['super_admin', 'moderator'])
}

export function canAssignRoles(profile: RoleSource): boolean {
  return hasAdminRole(profile, ['super_admin'])
}

export function canAdjustTokensNow(profile: RoleSource): boolean {
  if (!profile?.is_admin) return false
  if (profile.admin_role === 'super_admin') return true
  if (profile.admin_role !== 'support') return false
  if (!profile.token_permission_expires_at) return false
  return new Date(profile.token_permission_expires_at).getTime() > Date.now()
}
