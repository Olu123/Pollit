import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Lock, Globe2, Lightbulb, Trophy, Landmark, Mail, BarChart2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us — WePollit',
  description:
    "Learn about WePollit — Nigeria's credibly neutral people-powered opinion platform. Meet the founder and our advisory team.",
}

const VALUES = [
  {
    icon: Search,
    title: 'Credible Neutrality',
    body: 'We are not affiliated with any political party, organisation or government. WePollit exists to amplify the people’s voice — not shape it.',
  },
  {
    icon: Lock,
    title: 'Full Transparency',
    body: 'Every token ever distributed on WePollit is publicly visible at wepollit.com/transparency. We show our work.',
  },
  {
    icon: Landmark,
    title: 'Nigeria First',
    emoji: '🇳🇬',
    body: 'We started with Nigeria because Nigeria needs this most. A nation of 200+ million people, 300+ languages, and no credible polling infrastructure. WePollit is building that infrastructure.',
  },
  {
    icon: Globe2,
    title: 'Africa Always',
    body: 'Nigeria is our starting point — Africa is our vision. WePollit will grow to serve every African nation that needs a trusted public voice.',
  },
  {
    icon: Lightbulb,
    title: 'People Powered',
    body: 'WePollit is not a media company or a research firm. We are a platform — and the people are the product. Your opinions shape the narrative.',
  },
  {
    icon: Trophy,
    title: 'Credible Data',
    body: 'WePollit data is built on verified participation, state-by-state breakdowns and LGA-level insights — the most granular Nigerian public opinion data available anywhere.',
  },
]

function LinkedinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.556V9h3.564v11.452z" />
    </svg>
  )
}

function ValueCard({ icon: Icon, title, body, emoji, delay }: {
  icon: typeof Search
  title: string
  body: string
  emoji?: string
  delay: number
}) {
  return (
    <div
      className="animate-fade-in-up bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
        {emoji ? <span className="text-lg leading-none">{emoji}</span> : <Icon size={18} className="text-primary" strokeWidth={2.25} />}
      </div>
      <h3 className="font-black text-foreground text-[15px]">{title}</h3>
      <p className="text-sm text-foreground/75 leading-relaxed">{body}</p>
    </div>
  )
}

function Avatar({ initials, color }: { initials: string; color: 'red' | 'blue' }) {
  const styles = color === 'red' ? 'bg-[#DC2626]' : 'bg-[#2563eb]'
  return (
    <div
      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${styles} flex items-center justify-center text-white font-black text-2xl sm:text-3xl shrink-0 select-none`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 flex flex-col gap-5 text-center items-center animate-fade-in-up">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-foreground max-w-3xl">
            Nigeria deserves a platform that honours{' '}
            <span className="text-[#DC2626]">the voice of its people.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
            WePollit is building Africa&rsquo;s most credibly neutral public opinion infrastructure — one poll at a time.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-16 sm:gap-20 w-full">
        {/* Mission */}
        <section className="animate-fade-in-up flex flex-col gap-3 items-center text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Our Mission</h2>
          <p className="text-xl sm:text-2xl font-semibold text-foreground leading-snug max-w-2xl">
            WePollit exists to give every Nigerian a credible, neutral space to share honest opinions. We believe
            the voice of the people is powerful — and when individual voices come together, they create an
            authoritative picture of what Nigeria truly thinks.
          </p>
        </section>

        {/* Story */}
        <section className="animate-fade-in-up flex flex-col gap-4">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">Our Story</h2>
          <div className="flex flex-col gap-4 text-[15px] text-foreground/80 leading-relaxed">
            <p>WePollit was born from academic research and a deep conviction.</p>
            <p>
              Our founder spent years studying Nigerian online discourse and digital politics — culminating in a
              PhD in Communication from Universitat Pompeu Fabra. His research revealed a clear gap: Nigeria had
              no credible, neutral platform for public opinion.
            </p>
            <p>
              The concept of credible neutrality — a key takeaway from his doctoral research — became the
              foundation of WePollit. A platform where every Nigerian voice counts equally, every transaction is
              transparent, and the people&rsquo;s opinion cannot be manipulated or suppressed.
            </p>
            <p>
              WePollit launched in 2026 with a simple but powerful goal: to become the Reuters of African public
              opinion.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground text-center">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <ValueCard key={v.title} {...v} delay={i * 60} />
            ))}
          </div>
        </section>

        {/* Founder */}
        <section className="animate-fade-in-up flex flex-col gap-6">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground text-center">The Founder</h2>
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <Avatar initials="OO" color="red" />
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-foreground">Olusegun Ogundeji</h3>
                <p className="text-sm font-semibold text-primary">Founder</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-[15px] text-foreground/80 leading-relaxed">
              <p>Olusegun Ogundeji is a communication researcher, technology journalist and digital entrepreneur.</p>
              <p>
                He holds a PhD in Communication from Universitat Pompeu Fabra, where his research focused on
                Nigerian online discourse, Habermasian public sphere theory and digital politics — with credible
                neutrality as a key research principle that now underpins WePollit.
              </p>
              <p>
                He has covered African technology for IDG News Service, CIO Africa and ITWeb Africa, and has
                served as Press and Media assistant to a core member of an EU Election Observation Mission.
              </p>
              <p>
                He also founded 1news.ng — an automated Nigerian news platform — and has applied his research and
                journalistic background to building digital products for African audiences.
              </p>
            </div>

            <blockquote className="border-l-4 border-[#DC2626] pl-4 sm:pl-5 py-1 italic text-foreground/90 text-base sm:text-lg leading-relaxed">
              &ldquo;The voice of the people is the most powerful force in any democracy. Nigeria deserves a
              platform that honours that voice.&rdquo;
              <footer className="mt-2 text-sm font-semibold not-italic text-muted-foreground">
                — Olusegun Ogundeji, Founder
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Advisory Board */}
        <section className="animate-fade-in-up flex flex-col gap-6">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Advisory Board</h2>
            <p className="text-sm text-muted-foreground">
              Guided by expertise across technology, research and digital ecosystems.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <Avatar initials="OT" color="blue" />
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-black text-foreground">Olusegun Joel Titus</h3>
                <p className="text-sm font-semibold text-primary">Technology &amp; Web3 Advisor</p>
                <a
                  href="https://www.linkedin.com/in/olusegun-joel-titus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mt-1 justify-center sm:justify-start"
                >
                  <LinkedinIcon size={13} /> LinkedIn
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-4 text-[15px] text-foreground/80 leading-relaxed">
              <p>
                Olusegun Joel Titus is a technology entrepreneur, blockchain researcher and PhD candidate in
                Communication and Media Studies at Universitat Pompeu Fabra.
              </p>
              <p>
                He is the founder of CafeRadar, a smart café discovery platform live on the App Store.
                Previously, he spent four years as a Due Diligence Specialist at Seedify, evaluating blockchain
                and Web3 projects. A HackerNoon Contributor of the Year winner (Cybercrime category), he brings
                deep expertise in emerging technology and product development to WePollit.
              </p>
            </div>
          </div>
        </section>

        {/* Join the Mission */}
        <section className="animate-fade-in-up bg-[#DC2626] text-white rounded-2xl p-8 sm:p-12 flex flex-col gap-5 items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-black">Join the Mission</h2>
          <p className="text-sm sm:text-base text-white/90 max-w-xl leading-relaxed">
            WePollit is growing. If you share our vision of a credibly neutral, people-powered Nigeria — we&rsquo;d
            love to hear from you.
          </p>
          <p className="text-sm sm:text-base text-white/90 max-w-xl leading-relaxed">
            Whether you&rsquo;re a journalist, researcher, developer, community leader or simply a Nigerian who
            believes your voice matters — there&rsquo;s a place for you at WePollit.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-[#DC2626] font-bold text-sm px-6 min-h-[48px] rounded-full hover:brightness-95 active:scale-95 transition-all"
            >
              <Mail size={16} strokeWidth={2.5} /> Contact Us
            </Link>
            <Link
              href="/transparency"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/40 text-white font-bold text-sm px-6 min-h-[48px] rounded-full hover:bg-white/20 active:scale-95 transition-all"
            >
              <BarChart2 size={16} strokeWidth={2.5} /> View Transparency
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
