import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { trackOrder } from '../lib/order-api'

export const Route = createFileRoute('/track/')({
  component: TrackOrder,
  head: () => ({ meta: [{ title: 'Track Order — DTank-Kicks' }] }),
})

function TrackOrder() {
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = Route.useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) {
      setError("Please enter your tracking token.")
      return
    }

    setError(null)
    setLoading(true)
    try {
      // Verify token exists by fetching the order. If it does not exist, trackOrder will throw.
      await trackOrder(trimmed)
      nav({ 
        to: `/track/$token`,
        params: {
            token: trimmed,
        },
      })
    } catch (err) {
      setError("Tracking token not found. Please check the token and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Track your order</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Enter the tracking token you received in your order confirmation email, then submit to view the latest order status.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Tracking token</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="e.g. 3f8b1a4c9d2e7f0a"
            type="text"
            autoComplete="off"
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase text-gold-foreground transition hover:bg-gold/90 disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'View order status'}
        </button>
      </form>
    </div>
  )
}
