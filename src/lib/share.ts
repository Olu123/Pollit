import { SITE_DOMAIN } from './site'

export function whatsappHref(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

const url = (id: string) => `${SITE_DOMAIN}/polls/${id}`

// Contextual WhatsApp share messages.
export const shareMessages = {
  newPoll: (id: string, question: string) =>
    `🗳️ I just created a poll on WePollit!\n${question}\nCome vote and share your opinion 👇\n${url(id)}\n#WePollit #Nigeria`,

  afterVote: (id: string, question: string, pct: number) =>
    `I just voted on WePollit! 🗳️\n${question}\n${pct}% of Nigerians agree with me!\nWhat do you think? Vote here 👇\n${url(id)}\n#WePollit #NigerianPulse`,

  hotTake: (id: string, question: string) =>
    `🔥 HOT TAKE ALERT on WePollit!\n${question}\nThis one go cause argument... 👀\n${url(id)}\n#HotTake #WePollit`,

  community: (id: string, question: string, communityName: string, code: string) =>
    `${communityName} wants your vote! 🏘️\n${question}\nInvite code: ${code}\n${url(id)}\n#WePollit`,

  challenge: (id: string, question: string, pool: number) =>
    `🏆 CHALLENGE on WePollit!\n${question}\nJoin now and share the ${pool.toLocaleString()} token pool! 🪙\n${url(id)}\n#WePollit #Challenge`,

  invite: (username: string) =>
    `Invite friends to WePollit and earn 30 tokens each! 🎁\nUse my link: ${SITE_DOMAIN}?ref=${username}`,

  myCard: () =>
    `See my Nigerian identity on WePollit! What's yours? 👉 ${SITE_DOMAIN}`,

  verdict: (id: string, statement: string, question: string, citation: string) =>
    `🇳🇬 The Nigerian Verdict:\n${statement}\n\nPoll: ${question}\n${citation}\n\nSee full results: ${url(id)}\n#WePollit #NigerianVerdict`,
}
