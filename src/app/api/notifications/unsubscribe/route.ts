import { isNotificationType, verifyNotificationToken, preferenceColumn, NOTIFICATION_LABEL } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'

function page(title: string, message: string, status: number) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${title} — WePollit</title>
<style>
  body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#fafafa;color:#171717;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{max-width:440px;width:100%;background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;text-align:center}
  .dot{width:48px;height:48px;border-radius:12px;background:#DC2626;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:800}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:14px;color:#71717a;line-height:1.6;margin:0 0 20px}
  a{display:inline-block;background:#DC2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px}
</style></head>
<body><div class="card">
  <div class="dot">✓</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${SITE_URL}/profile">Manage in profile</a>
</div></body></html>`
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  if (!isNotificationType(type) || !verifyNotificationToken(uid, type, token)) {
    return page('Invalid link', 'This unsubscribe link is invalid or has expired. Please use the link from your most recent email.', 400)
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ [preferenceColumn(type)]: false })
    .eq('id', uid)

  if (error) {
    console.error('[notifications/unsubscribe] update failed:', error)
    return page('Something went wrong', 'We could not update your preferences right now. Please try again later, or update them from your profile.', 500)
  }

  return page('Unsubscribed', `You've been unsubscribed from ${NOTIFICATION_LABEL[type]}. You can re-enable this anytime in your profile settings.`, 200)
}
