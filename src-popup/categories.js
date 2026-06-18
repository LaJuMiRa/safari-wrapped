// categories.js — grobe Domain→Kategorie-Zuordnung (rein lokal, kein Lookup).
// Wird nur zur Anzeige im Popup genutzt. Erweiterbar: einfach Regeln ergänzen.

export const CATEGORIES = {
  dev:          { label: 'Entwicklung',   color: '#3b82f6' },
  ai:           { label: 'KI',            color: '#7b5cff' },
  social:       { label: 'Social',        color: '#ec4899' },
  video:        { label: 'Video',         color: '#ef4444' },
  news:         { label: 'News',          color: '#f59e0b' },
  shopping:     { label: 'Shopping',      color: '#10b981' },
  productivity: { label: 'Produktivität', color: '#8b5cf6' },
  reference:    { label: 'Wissen',        color: '#14b8a6' },
  finance:      { label: 'Finanzen',      color: '#22c55e' },
  email:        { label: 'E-Mail',        color: '#0ea5e9' },
  music:        { label: 'Musik',         color: '#a855f7' },
  search:       { label: 'Suche',         color: '#64748b' },
  other:        { label: 'Sonstiges',     color: '#6b7280' },
};

// Reihenfolge zählt: erste passende Regel gewinnt.
const RULES = [
  [/(github|gitlab|stackoverflow|stackexchange|npmjs\.com|developer\.|mdn|bitbucket|codepen|jsfiddle|vercel|netlify|localhost|codesandbox)/, 'dev'],
  [/(openai|chatgpt|claude\.ai|anthropic|perplexity|gemini|huggingface|midjourney|copilot)/, 'ai'],
  [/(youtube|youtu\.be|vimeo|twitch|netflix|disney|primevideo|dailymotion)/, 'video'],
  [/(spotify|soundcloud|music\.apple|bandcamp|deezer)/, 'music'],
  [/(twitter|x\.com|facebook|instagram|tiktok|reddit|linkedin|threads|mastodon|bluesky|snapchat|pinterest|discord)/, 'social'],
  [/(nytimes|theguardian|bbc|cnn|spiegel|zeit\.de|faz\.net|tagesschau|heise|reuters|bloomberg|welt\.de|sueddeutsche)/, 'news'],
  [/(amazon|ebay|etsy|aliexpress|otto\.de|zalando|shopify|idealo)/, 'shopping'],
  [/(notion|trello|asana|linear\.app|slack|atlassian|jira|confluence|figma|miro|docs\.google|drive\.google|dropbox|office)/, 'productivity'],
  [/(wikipedia|wikihow|wolframalpha|britannica|arxiv|scholar\.google|coursera|udemy|khanacademy)/, 'reference'],
  [/(paypal|sparkasse|comdirect|trade republic|traderepublic|n26|revolut|coinbase|binance|finanzen\.|bank)/, 'finance'],
  [/(mail\.google|gmail|outlook|mail\.proton|gmx|web\.de|mail\.yahoo)/, 'email'],
  [/(google\.|bing\.com|duckduckgo|ecosia|qwant|startpage|search\.brave|yandex|baidu)/, 'search'],
];

export function categoryFor(domain) {
  if (!domain) return 'other';
  for (const [re, cat] of RULES) {
    if (re.test(domain)) return cat;
  }
  return 'other';
}
