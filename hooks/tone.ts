// How a prompt sounds to the band, so the character can meet it: thanks or praise make
// it blush and dance, a hurry makes it start and work at speed, a question makes it
// scratch its head. In English and in Arabic.

import type { Tone } from '../types'

export type { Tone }

// Words of thanks, wherever they stand in a prompt.
const THANKS = [
  /\b(thanks|thank you|thx|tysm|ty|cheers|merci|gracias|danke)\b/,
  /(شكر|مشكور|تسلم|يعطيك العافيه|جزاك الله|بارك الله)/,
]

// Words of praise, which a short prompt is, and a long one may only mention.
const PRAISE = [
  /\b(great|nice|awesome|perfect|amazing|excellent|brilliant|well done|good job|love it)\b/,
  /(ممتاز|رائع|احسنت|ابدعت|كفو|جميل|عظيم)/,
]

// Words of a hurry.
const URGENT = [
  /\b(urgent|urgently|asap|hurry|quickly|right now|immediately|emergency)\b/,
  /(عاجل|بسرعه|سريعا|فورا|حالا|ضروري|مستعجل|استعجل)/,
]

// How a question opens, when it ends with no question mark.
const QUESTION = [
  /^(how|why|what|when|where|which|who|whose|is|are|was|were|can|could|would|should|does|do|did|will)\b/,
  /^(هل|كيف|لماذا|ليش|ماذا|ما هو|ما هي|ما رايك|متى|اين|وين|كم|من هو|من هي|ايش|شو)(\s|$)/,
]

// The longest prompt read as thanks or praise as a whole: a few words, no request.
const SHORT = 24

// The prompt with what a person did not type left out (tags the app wraps around
// a command's lines), Arabic's short vowels dropped, and its alefs and hamzas written
// one way, so one spelling of a word serves for all.
function plainOf(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة(?=\s|$)/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * How the prompt `text` sounds: `none` when nothing was typed; a hurry before all, as
 * it sets the pace of the whole turn; then thanks or praise in a short prompt; then a
 * question; then thanks anywhere in a longer one; else plain.
 */
export function toneOf(text: string): Tone {
  const plain = plainOf(text)

  if (plain === '') {
    return 'none'
  }
  if (plain.startsWith('/')) {
    return 'plain'
  }
  const has = (patterns: readonly RegExp[]) => patterns.some(pattern => pattern.test(plain))

  if (has(URGENT)) {
    return 'urgent'
  }
  if (plain.length <= SHORT && (has(THANKS) || has(PRAISE))) {
    return 'thanks'
  }
  if (/[?؟][^\s?؟]{0,3}$/.test(plain) || has(QUESTION)) {
    return 'question'
  }

  return has(THANKS) ? 'thanks' : 'plain'
}
