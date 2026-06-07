'use client'

// Temporary hook to verify Sentry captures client errors. Renders only in
// development (and is hidden); flip `className` to trigger a test error.
export default function SentryTestButton() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <button
      onClick={() => {
        throw new Error('Sentry test error from WePollit')
      }}
      className="hidden"
    >
      Test Sentry
    </button>
  )
}
