// Maps Supabase auth errors to short, user-facing messages so raw
// provider/internal error text is never shown directly in the UI.
export function friendlyAuthError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.'
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (code === 'weak_password' || msg.includes('password should be')) {
    return 'Please choose a stronger password (at least 8 characters).'
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_sms_send_rate_limit' || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('sms')) {
    return 'Could not send the verification code. Please check the number and try again.'
  }
  if (code === 'otp_expired' || msg.includes('expired') || msg.includes('invalid otp') || msg.includes('token has expired')) {
    return 'That code is invalid or has expired. Please request a new one.'
  }
  if (msg.includes('network') || msg.includes('fetch failed')) {
    return 'Network error. Please check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}
