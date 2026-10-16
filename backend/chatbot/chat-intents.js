function normalize(message) {
  return String(message || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('id')
    .replace(/([\p{L}\p{N}])\1+/gu, '$1')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function editDistanceAtMostOne(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  if (i < left.length || j < right.length) edits += 1;
  return edits <= 1;
}

const GREETINGS = ['halo', 'hai', 'hei', 'hi', 'hello', 'hey', 'hiya', 'helo', 'pagi', 'siang', 'sore', 'malam', 'yo', 'oy', 'assalamualaikum'];
const GREETING_FILLERS = new Set(['system', 'kak', 'min', 'dong', 'ya', 'nih', 'cuy', 'bro', 'guys']);

function isGreetingWord(word) {
  const compact = word.replace(/(.)\1+/gu, '$1');
  return GREETINGS.some((greeting) => compact === greeting
    || (Math.min(compact.length, greeting.length) >= 4 && editDistanceAtMostOne(compact, greeting)));
}

function detectChatIntent(message) {
  const text = normalize(message);
  const words = text.split(' ').filter(Boolean);
  const greetingRemainder = words.slice(1).join(' ');
  const greetingOnly = words.length && isGreetingWord(words[0])
    && (words.slice(1).every((word) => GREETING_FILLERS.has(word) || isGreetingWord(word))
      || /^(?:apa kabar|gimana kabar|lagi apa|how are you|there)(?: system| kak| min)?$/u.test(greetingRemainder));
  if (greetingOnly || /^selamat (?:pagi|siang|sore|malam)(?: system| kak| min)?$/u.test(text)) return 'greeting';
  if (/^(?:terima kasih|terimakasih|makasih|makasi|trims|thanks|thank you|thanks a lot)(?: ya| banyak| banget| kak| min| system| paham| membantu| jelas)*$/u.test(text)) return 'thanks';
  if (/(?:\b(?:materi|topik|bahasan|modul|isi|dipelajari|belajar|ajarin)\b|modulnya)/u.test(text)
    && /(?:\b(?:apa|saja|aja|isi|topik)\b|bisa dipelajari|yang ada|dibahas)/u.test(text)) return 'module-overview';
  return null;
}

module.exports = { detectChatIntent, normalize, editDistanceAtMostOne };
