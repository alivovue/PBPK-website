const ACCEPTANCE = /^(?:(?:mau|iya|ya|boleh|ayo|oke|ok|gas|sip|yes|sure)(?:\s+(?:dong|deh|ya|aja|banget))?|(?:boleh|coba|iya|ya|mau)\s+(?:jelasin|jelaskan|terangkan)(?:\s+(?:dong|deh|ya|aja))?|(?:jelasin|jelaskan)(?:\s+(?:dong|aja|ya))?)[.!?]*$/iu;
const CONTINUATION = /^(?:(?:apa\s+)?maksud(?:nya)?|contoh(?:nya)?|kenapa|mengapa|gimana|bagaimana|terus|lanjut|lebih sederhana|lebih simpel|lebih detail|detail(?:nya)?|jelasin lagi|jelaskan lagi|ulang(?:i)?|yang tadi|itu apa|yang pertama|poin pertama)(?:\s+.{1,100})?[.!?]*$/iu;
const MATERIAL_REPLY = /System menemukan bagian yang mungkin membantu|Ini kutipan materi yang terkait/iu;

function isShortFollowUp(message) {
  return ACCEPTANCE.test(message) || CONTINUATION.test(message);
}

function resolveContextualQuestion(message, history = []) {
  if (typeof message !== 'string' || !isShortFollowUp(message.trim()) || !Array.isArray(history)) return null;
  const lastAssistant = [...history].reverse().find((turn) => turn?.role === 'model' && typeof turn.text === 'string');
  if (!lastAssistant || !(lastAssistant.hasSources || MATERIAL_REPLY.test(lastAssistant.text))) return null;
  const previousQuestion = [...history].reverse().find((turn) => turn?.role === 'user'
    && typeof turn.text === 'string'
    && turn.text.trim()
    && !isShortFollowUp(turn.text.trim()));
  return previousQuestion?.text.trim() || null;
}

module.exports = { resolveContextualQuestion, isShortFollowUp };
