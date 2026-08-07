export const QUOTES = [
  "Small steps, repeated daily, outrun big leaps taken rarely.",
  "You didn't just show up today — you showed up on purpose.",
  "Consistency is the quiet compound interest of a life well built.",
  "This is what keeping a promise to yourself looks like.",
  "Discipline is choosing what you want most over what you want now.",
  "The goal was never the finish line — it was who you became reaching it.",
  "Progress doesn't ask for perfection, only for return.",
  "Every rep, every rest day, every restart — it all counted.",
  "You are the sum of days like this one.",
  "Nobody saw most of the work. That's exactly why it matters.",
  "The streak isn't the point. The person it's shaping is.",
  "Well done — future you is already grateful.",
];

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
