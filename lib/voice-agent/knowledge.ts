// Static knowledge base for Tiffany's Tales Book Club.
// FALLBACK for the lookup_knowledge function call: app/api/knowledge grounds
// answers in the Postgres document store (lib/voice/documents) and only calls
// this when the store has no match or is unavailable. Kept here (React-/Node-free)
// so the embeddable core never depends on a database being up.

export interface KnowledgeEntry {
  keywords: string[];
  answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ["price", "pricing", "cost", "how much", "membership", "fee", "join", "pay", "monthly"],
    answer:
      "Membership is just ten pounds a month, and it includes our monthly in-person meet-up and the everyday online chat. You can join from the link on the site.",
  },
  {
    keywords: ["pack", "packs", "group", "where", "location", "maidstone", "sittingbourne", "meet", "meeting", "meetup", "in person"],
    answer:
      "We're a cosy in-person book club with two packs — the Maidstone Pack, our home base, and the Sittingbourne Pack. Each pack meets once a month over a warm drink to talk about the book, and we chat online every day in between.",
  },
  {
    keywords: ["book of the month", "this month", "current", "reading", "currently", "pick", "read"],
    answer:
      "Every month we pick a Book of the Month to read and discuss together — anything from page-turning thrillers to heart-warming romances. Grab a copy, find a comfy chair, and join the conversation.",
  },
  {
    keywords: ["suggest", "recommend", "choose", "pick a book", "suggestion"],
    answer:
      "Yes — we welcome book suggestions from members, so our discussions stay diverse and engaging. Bring along anything you'd love the pack to read.",
  },
  {
    keywords: ["about", "what is", "who", "club", "community", "belong", "sanctuary"],
    answer:
      "Tiffany's Tales is a warm community of bookworms from all walks of life, here to celebrate the written word — from thought-provoking discussions to laid-back chats. It's your literary sanctuary. Join my pack today!",
  },
  {
    keywords: ["benefit", "benefits", "why join", "connection", "discussion", "story"],
    answer:
      "Joining brings three lovely things: real connection with fellow readers, lively monthly discussion, and a fresh story to enjoy each month — plus a real sense of belonging.",
  },
  {
    keywords: ["contact", "email", "question", "reach", "get in touch", "help"],
    answer:
      "You can reach us through the contact form on the site — ask anything, or let us know you'd like to join the in-person club.",
  },
];

export function lookupKnowledge(query: string): string {
  const q = query.toLowerCase();
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    const score = entry.keywords.reduce(
      (n, kw) => (q.includes(kw) ? n + 1 : n),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) return best.answer;
  return "I'm not certain about that one, but I'd love to help you explore the club or point you to the contact form so the team can answer.";
}
