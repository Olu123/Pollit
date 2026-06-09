import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Calendar, User, Share2, Users2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Poll } from '@/lib/types'
import VotingPanel from '@/components/VotingPanel'
import StateBreakdown from '@/components/StateBreakdown'
import FloatingShare from '@/components/FloatingShare'
import CommunityGate from '@/components/CommunityGate'
import PollActionsMenu from '@/components/PollActionsMenu'
import { T } from '@/components/LanguageProvider'
import { SITE_URL } from '@/lib/site'
import { shareMessages, whatsappHref } from '@/lib/share'

const POLL_SELECT = `
  id, question, category, created_by, expires_at, total_votes, is_hot_take,
  is_community, community_name, community_code, community_password, created_at,
  is_challenge, challenge_pool, challenge_status, challenge_distributed,
  profile:profiles!created_by ( id, username, avatar_url ),
  options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
`

export const revalidate = 60

async function getPoll(id: string): Promise<Poll | null> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error || !data) return null
  const poll = data as unknown as Poll
  poll.options = [...poll.options].sort((a, b) => a.display_order - b.display_order)
  return poll
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const poll = await getPoll(id)
  if (!poll || poll.is_community) return { title: 'Pollit' }
  return {
    title: `${poll.question} — Pollit`,
    openGraph: {
      title: poll.question,
      description: 'Vote now on Pollit 🗳️',
      url: `${SITE_URL}/polls/${id}`,
      images: [{ url: `/api/og/poll/${id}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [`/api/og/poll/${id}`] },
  }
}

export default async function PollPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const { id } = await params
  const { code } = await searchParams
  const poll = await getPoll(id)
  if (!poll) notFound()

  // Community poll gate — require the invite code.
  if (poll.is_community && poll.community_code && code !== poll.community_code) {
    return <CommunityGate pollId={poll.id} communityName={poll.community_name} />
  }

  const createdAt = new Date(poll.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const shareMsg =
    poll.is_challenge
      ? shareMessages.challenge(poll.id, poll.question, poll.challenge_pool, poll.total_votes)
      : poll.is_community && poll.community_name && poll.community_code
        ? shareMessages.community(poll.id, poll.question, poll.community_name, poll.community_code)
        : poll.is_hot_take
          ? shareMessages.hotTake(poll.id, poll.question)
          : shareMessages.newPoll(poll.id, poll.question)

  const url = `${SITE_URL}/polls/${poll.id}`
  const links = {
    whatsapp: whatsappHref(shareMsg),
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(poll.question)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${poll.question} — ${url}`)}`,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">
      <FloatingShare href={links.whatsapp} />

      {/* Back link + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 -ml-1 px-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={15} />
          <T k="vote.allPolls" />
        </Link>
        <PollActionsMenu pollId={poll.id} createdBy={poll.created_by} redirectHome />
      </div>

      {/* Poll card */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-8 shadow-sm flex flex-col gap-5 sm:gap-6">
        {/* Community banner */}
        {poll.is_community && (
          <div className="flex items-center gap-2 bg-primary-light text-primary rounded-xl px-3 py-2.5">
            <Users2 size={16} strokeWidth={2.5} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold"><T k="community.badge" /></p>
              {poll.community_name && (
                <p className="text-sm font-bold text-foreground truncate">{poll.community_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {poll.profile?.username && (
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span>@{poll.profile.username}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{createdAt}</span>
          </div>
        </div>

        {/* Voting panel (client — handles real-time, auth, RPC) */}
        <VotingPanel poll={poll} />
      </div>

      {/* 📍 State-by-state breakdown */}
      <StateBreakdown poll={poll} />

      {/* Prominent share section */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Share2 size={16} className="text-primary" strokeWidth={2.5} />
          <T k="detail.shareTitle" />
        </div>
        <p className="text-xs text-muted-foreground"><T k="detail.shareSub" /></p>
        <div className="flex items-center gap-2.5">
          <ShareButton href={links.whatsapp} label="Share on WhatsApp"    cls="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20"><WhatsAppIcon /></ShareButton>
          <ShareButton href={links.telegram} label="Share on Telegram"    cls="bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20"><TelegramIcon /></ShareButton>
          <ShareButton href={links.facebook} label="Share on Facebook"    cls="bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20"><FacebookIcon /></ShareButton>
          <ShareButton href={links.twitter}  label="Share on Twitter / X" cls="bg-foreground/8 text-foreground hover:bg-foreground/15"><TwitterXIcon /></ShareButton>
        </div>
      </div>
    </main>
  )
}

function ShareButton({ href, label, cls, children }: { href: string; label: string; cls: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-150 active:scale-95 ${cls}`}
    >
      {children}
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.054 23.447a.75.75 0 0 0 .916.977l5.7-1.494A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 0 1-5.071-1.38l-.364-.214-3.763.987.999-3.667-.236-.375A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}
function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
function TwitterXIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}