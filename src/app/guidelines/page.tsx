import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Community Guidelines — Pollit',
  description: 'How we keep Pollit honest, safe and valuable for all Nigerians.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <div className="text-sm text-foreground/80 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  )
}

function List({ items, mark }: { items: string[]; mark: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="shrink-0">{mark}</span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  )
}

export default function GuidelinesPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">Pollit Community Guidelines</h1>
        <p className="text-sm text-muted-foreground">How we keep Pollit honest, safe and valuable for all Nigerians.</p>
        <p className="text-xs text-muted-foreground">Last updated: June 2026</p>
      </header>

      <Section title="Our Mission">
        <p>
          Pollit exists to give every Nigerian a credible, neutral platform to share their honest opinions.
          We believe in the power of the people — when individual voices come together, they create an
          authoritative picture of what Nigeria truly thinks.
        </p>
      </Section>

      <Section title="Who Can Use Pollit">
        <List mark="•" items={[
          'Anyone with a valid phone number or social media account',
          'You must be at least 13 years old',
          'One account per person — multiple accounts will be suspended',
          'Nigerian residents and diaspora are all welcome',
        ]} />
      </Section>

      <Section title="Creating Polls">
        <p className="font-semibold text-foreground">✅ Allowed:</p>
        <List mark="✅" items={[
          'Genuine questions seeking public opinion',
          'Questions on politics, sports, entertainment, business, lifestyle and current affairs',
          'Community polls for groups, associations and organisations',
          'Hot Take polls (for users with 100+ tokens)',
        ]} />
        <p className="font-semibold text-foreground mt-2">❌ Not Allowed:</p>
        <List mark="❌" items={[
          'Polls designed to mislead or manipulate',
          'Polls containing hate speech or discriminatory language',
          'Spam or repetitive polls',
          'Polls promoting illegal activities',
          'Polls targeting specific individuals maliciously',
        ]} />
      </Section>

      <Section title="Voting & Comments">
        <p className="font-semibold text-foreground">✅ Allowed:</p>
        <List mark="✅" items={[
          'Voting your honest opinion',
          'Constructive comments that add value',
          'Respectful disagreement',
          'Sharing results on social media',
        ]} />
        <p className="font-semibold text-foreground mt-2">❌ Not Allowed:</p>
        <List mark="❌" items={[
          'Coordinated voting to manipulate results',
          'Hate speech in comments',
          'Tribal or religious incitement',
          'Personal attacks on other users',
          'Sharing misleading poll results out of context',
        ]} />
      </Section>

      <Section title="Your Profile & Identity">
        <div className="border-2 border-[#DC2626]/30 bg-[#DC2626]/5 rounded-xl p-4 flex flex-col gap-2">
          <p>
            Pollit requires that your registered full name matches your official government identification
            document exactly.
          </p>
          <p className="font-semibold text-foreground">Accepted documents:</p>
          <List mark="•" items={[
            'National Identity Card (NIN)',
            'International Passport',
            "Driver's Licence",
            "Permanent Voter's Card (PVC)",
          ]} />
          <p>
            This requirement is in place to maintain the integrity of our platform and to ensure your account
            remains in good standing. Users found to have provided false identity information may have their
            accounts permanently suspended.
          </p>
        </div>
      </Section>

      <Section title="Tokens & Rewards">
        <List mark="•" items={[
          'You earn 10 tokens per vote',
          'You earn 30 tokens per poll created',
          'You earn 100 tokens per successful referral',
          'Tokens appear on the leaderboard',
          'Token values and utility will grow as the platform grows',
          'Tokens are non-transferable between accounts',
          'Pollit reserves the right to adjust token rewards at any time',
        ]} />
      </Section>

      <Section title="Enforcement">
        <p>Pollit reserves the right to:</p>
        <List mark="•" items={[
          'Remove any poll or comment that violates these guidelines',
          'Suspend or permanently ban accounts for repeated violations',
          'Adjust token balances in cases of detected manipulation',
          'Update these guidelines at any time with notice to users',
        ]} />
      </Section>

      <Section title="Contact & Reporting">
        <p>
          To report a poll, comment or user, use the report button (⚑) on any poll or comment.
        </p>
        <p>Have a question or concern? <Link href="/contact" className="text-primary font-semibold">Use our Contact form.</Link></p>
      </Section>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        These guidelines are effective from June 2026. Pollit is committed to being a credibly neutral
        platform for all Nigerians.
      </p>
    </main>
  )
}
