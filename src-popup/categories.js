// categories.js — grobe Domain→Kategorie-Zuordnung (rein lokal, kein Lookup).
// Wird nur zur Anzeige im Popup genutzt. Erweiterbar: einfach Regeln ergänzen.

// Muted, warm abgestimmte Kategorie-Farben (zur dezenten Palette passend).
export const CATEGORIES = {
  dev:          { label: 'Entwicklung',   color: '#6f93b0' },
  ai:           { label: 'KI',            color: '#9d8bb3' },
  social:       { label: 'Social',        color: '#c2849c' },
  video:        { label: 'Video',         color: '#c47a6e' },
  news:         { label: 'News',          color: '#c9a36b' },
  shopping:     { label: 'Shopping',      color: '#7faa8e' },
  productivity: { label: 'Produktivität', color: '#9a8fb5' },
  reference:    { label: 'Wissen',        color: '#6faaa0' },
  finance:      { label: 'Finanzen',      color: '#86a982' },
  email:        { label: 'E-Mail',        color: '#7ba0b3' },
  music:        { label: 'Musik',         color: '#a98ab0' },
  search:       { label: 'Suche',         color: '#8d8a86' },
  other:        { label: 'Sonstiges',     color: '#8a8279' },
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
