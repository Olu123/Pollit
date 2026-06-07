'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ThumbsUp, ThumbsDown, MessageCircle, HelpCircle } from 'lucide-react'
import ViewTracker from '@/components/ViewTracker'

type Category =
  | 'About WePollit'
  | 'Voting & Polls'
  | 'Tokens'
  | 'Challenges'
  | 'Account & Privacy'
  | 'Safety & Community'
  | 'Data & Transparency'

interface QA {
  category: Category
  q: string
  a: string
}

const CATEGORIES: Category[] = [
  'About WePollit',
  'Voting & Polls',
  'Tokens',
  'Challenges',
  'Account & Privacy',
  'Safety & Community',
  'Data & Transparency',
]

const FAQS: QA[] = [
  // ── About WePollit ──
  {
    category: 'About WePollit',
    q: 'What is WePollit?',
    a: 'WePollit is Nigeria’s home for honest public opinion. Create polls, vote on topics that matter — from politics and sports to entertainment, business and everyday life — and see how the country really feels, broken down by state.',
  },
  {
    category: 'About WePollit',
    q: 'Is WePollit free to use?',
    a: 'Yes. Creating an account, voting, and making polls are all completely free. You even earn tokens for taking part.',
  },
  {
    category: 'About WePollit',
    q: 'Do I need an account to vote?',
    a: 'You need a free account to vote, comment, create polls and earn tokens. This keeps results genuine and limits one vote per person per poll.',
  },
  {
    category: 'About WePollit',
    q: 'What languages does WePollit support?',
    a: 'WePollit works in both English and Nigerian Pidgin. Use the language toggle in the navigation bar to switch at any time.',
  },

  // ── Voting & Polls ──
  {
    category: 'Voting & Polls',
    q: 'How do I vote on a poll?',
    a: 'Open any poll, tap the option you agree with, and your vote is recorded instantly. You can add an optional comment and see live results, including a state-by-state breakdown of how Nigeria voted.',
  },
  {
    category: 'Voting & Polls',
    q: 'Can I change my vote after voting?',
    a: 'You get one vote per poll. Vote thoughtfully — once recorded, your choice counts toward the live results.',
  },
  {
    category: 'Voting & Polls',
    q: 'Is there a limit to how many times I can vote?',
    a: 'To keep results fair and block automated abuse, you can cast up to 30 votes per hour. Normal voting will never hit this limit.',
  },
  {
    category: 'Voting & Polls',
    q: 'How do I create a poll?',
    a: 'Tap “Create”, write a clear question, add 2–6 options, pick a category and a duration, then publish. Your account must be at least 1 hour old before you can create polls.',
  },
  {
    category: 'Voting & Polls',
    q: 'Why can’t I create a poll yet?',
    a: 'Your account must be at least 1 hour old before you can create polls. This short wait helps keep WePollit genuine and free from spam. In the meantime, explore polls and vote to earn tokens.',
  },
  {
    category: 'Voting & Polls',
    q: 'How many polls can I create per day?',
    a: 'New accounts (less than a week old) can create up to 2 polls per day. After your first week, that rises to 5 polls per day.',
  },
  {
    category: 'Voting & Polls',
    q: 'What is a Hot Take?',
    a: 'A Hot Take is a bold, eye-catching poll with a distinctive dark style. You need at least 100 tokens to publish one, so they’re reserved for active members of the community.',
  },
  {
    category: 'Voting & Polls',
    q: 'What is a Community Poll?',
    a: 'A Community Poll is private — only people with your invite code (and optional password) can vote. It’s perfect for an association, class, office or group that wants its own private vote.',
  },
  {
    category: 'Voting & Polls',
    q: 'How long does a poll stay open?',
    a: 'When you create a poll you choose how long it runs — 24 hours, 3 days, 7 days or 30 days. After that it closes and the final results are locked in.',
  },

  // ── Tokens ──
  {
    category: 'Tokens',
    q: 'What are tokens?',
    a: 'Tokens are WePollit’s reward points. You earn them for taking part — voting, creating polls, joining challenges and inviting friends. They power the leaderboard and unlock features like Hot Takes.',
  },
  {
    category: 'Tokens',
    q: 'How many tokens do I earn?',
    a: 'You earn 5 tokens for each vote, 20 tokens for creating a poll, 7 tokens for joining a challenge, and 30 tokens when a friend signs up using your referral link. Challenge prize pools are paid out on top of that.',
  },
  {
    category: 'Tokens',
    q: 'What can I do with tokens?',
    a: 'Tokens climb your position on the leaderboard and unlock perks — for example, you need 100 tokens to publish a Hot Take. We’re continually adding new ways to use them.',
  },
  {
    category: 'Tokens',
    q: 'Can I lose tokens?',
    a: 'Tokens are awarded for genuine participation. Accounts found gaming the system — through coordinated voting, fake accounts or other abuse — may be flagged, suspended, and have rewards reversed.',
  },
  {
    category: 'Tokens',
    q: 'Where can I see my token history?',
    a: 'Every token movement is recorded on a public, immutable ledger. Visit the Transparency page to see total tokens distributed and a full breakdown by reason.',
  },

  // ── Challenges ──
  {
    category: 'Challenges',
    q: 'What is a Challenge?',
    a: 'A Challenge is a special poll with a token prize pool. Vote to join, and when the challenge ends the pool is shared among everyone who took part — on top of the standard join reward.',
  },
  {
    category: 'Challenges',
    q: 'How do I join a Challenge?',
    a: 'Open a challenge poll before it expires and cast your vote. That registers you as a participant and earns you 7 tokens immediately, plus your share of the pool when the challenge is settled.',
  },
  {
    category: 'Challenges',
    q: 'How is the prize pool shared?',
    a: 'When a challenge ends, the prize pool is split equally among all participants and credited straight to their token balances. Every payout is logged on the public transparency ledger.',
  },
  {
    category: 'Challenges',
    q: 'Can I create my own Challenge?',
    a: 'Challenges are created by the WePollit team to keep prize pools fair and funded. Keep an eye on the Challenges tab for new ones to join.',
  },

  // ── Account & Privacy ──
  {
    category: 'Account & Privacy',
    q: 'How do I update my profile?',
    a: 'Go to your Profile page from the navigation menu. You can update your username, bio, state of origin and other details at any time.',
  },
  {
    category: 'Account & Privacy',
    q: 'Can I have more than one account?',
    a: 'No. WePollit is one account per person. Multiple or fake accounts undermine honest results and may lead to suspension of all the accounts involved.',
  },
  {
    category: 'Account & Privacy',
    q: 'What personal information does WePollit collect?',
    a: 'We collect only what we need to run your account and keep results genuine — such as your sign-in details and optional profile information you choose to add. See our Privacy Policy for the full details.',
  },
  {
    category: 'Account & Privacy',
    q: 'Is my IP address stored?',
    a: 'For security and abuse-prevention we may store a hashed (scrambled) version of your IP address, never the raw address. It’s used only to detect coordinated abuse, and is visible to administrators only.',
  },
  {
    category: 'Account & Privacy',
    q: 'How do I delete my account?',
    a: 'Reach out through the Contact page and our team will help you remove your account and associated data.',
  },

  // ── Safety & Community ──
  {
    category: 'Safety & Community',
    q: 'What are the community guidelines?',
    a: 'Vote honestly, keep comments respectful, and post genuine questions. No hate speech, tribalism, discrimination, spam or fake polls. One account per person. You can read the full list on the Guidelines page.',
  },
  {
    category: 'Safety & Community',
    q: 'How does WePollit prevent fake votes and bots?',
    a: 'WePollit runs an automated behavioural-flagging system that watches for rapid voting, new-account vote bursts, poll-creation bursts and coordinated voting. Suspicious activity is flagged for review and can lead to suspension.',
  },
  {
    category: 'Safety & Community',
    q: 'What is coordinated voting and why is it blocked?',
    a: 'Coordinated voting is when a cluster of similar, often newly-created accounts vote together to swing a poll. Our system detects these patterns and flags the poll and accounts involved, because they distort honest public opinion.',
  },
  {
    category: 'Safety & Community',
    q: 'How do I report a poll or comment?',
    a: 'Use the report option on any poll or comment. Reports go straight to the moderation team, who can dismiss them, remove content, or suspend the user responsible.',
  },
  {
    category: 'Safety & Community',
    q: 'What happens if I break the rules?',
    a: 'Depending on severity, your account may receive a warning or be suspended, and any rewards earned through abuse may be reversed. Repeated or serious violations can result in permanent removal.',
  },

  // ── Data & Transparency ──
  {
    category: 'Data & Transparency',
    q: 'What is the Transparency page?',
    a: 'The Transparency page gives anyone — signed in or not — a live view of the token economy: total tokens distributed, a breakdown by reason, and daily distribution trends.',
  },
  {
    category: 'Data & Transparency',
    q: 'Is the token ledger really public?',
    a: 'Yes. Every token transaction is written to a public ledger that can be read by anyone and can never be deleted, so the numbers can always be independently checked.',
  },
  {
    category: 'Data & Transparency',
    q: 'How are poll results calculated?',
    a: 'Results are simple, transparent vote tallies updated in real time. Each option shows its share of the total, and you can drill into a state-by-state breakdown to see regional differences.',
  },
  {
    category: 'Data & Transparency',
    q: 'Can results be edited or rigged?',
    a: 'No one can hand-edit vote counts. Votes are recorded through secure server functions, rate-limited, and continuously screened for abuse, so the results you see reflect genuine participation.',
  },
]

export default function FaqPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'All' | Category>('All')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQS.filter((item) => {
      if (category !== 'All' && item.category !== category) return false
      if (!q) return true
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    })
  }, [query, category])

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <ViewTracker event="faq" />
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
          <HelpCircle size={26} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">Frequently Asked Questions</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Everything you need to know about voting, polls, tokens, challenges and staying safe on WePollit.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 mb-4 focus-within:ring-2 focus-within:ring-primary">
        <Search size={17} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="flex-1 bg-transparent text-base outline-none py-3 min-w-0 placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0">
            Clear
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap mb-6 pb-1">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full transition-colors min-h-[40px] ${
              category === c
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No questions match “{query}”. Try a different search or{' '}
          <Link href="/contact" className="text-primary font-semibold hover:underline">ask us directly</Link>.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const key = `${item.category}::${item.q}`
            const open = openKey === key
            const vote = feedback[key]
            return (
              <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenKey(open ? null : key)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm sm:text-[15px] font-semibold text-foreground">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Animated accordion body */}
                <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>

                      {/* Was this helpful? */}
                      <div className="flex items-center gap-3 pt-1 border-t border-border">
                        {vote ? (
                          <span className="text-xs text-muted-foreground py-1">Thanks for your feedback! 🙏</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">Was this helpful?</span>
                            <button
                              onClick={() => setFeedback((f) => ({ ...f, [key]: 'up' }))}
                              aria-label="Yes, helpful"
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <ThumbsUp size={15} />
                            </button>
                            <button
                              onClick={() => setFeedback((f) => ({ ...f, [key]: 'down' }))}
                              aria-label="No, not helpful"
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <ThumbsDown size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Contact CTA */}
      <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6 flex flex-col items-center text-center gap-3">
        <MessageCircle size={24} className="text-primary" />
        <h2 className="text-lg font-black text-foreground">Still have questions?</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Can’t find what you’re looking for? Our team is happy to help.
        </p>
        <Link
          href="/contact"
          className="bg-primary text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all min-h-[48px] flex items-center"
        >
          Contact Us
        </Link>
      </div>
    </main>
  )
}
