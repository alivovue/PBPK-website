const ACCEPTANCE = /^(?:(?:mau|iya|ya|boleh|ayo|oke|ok|gas|sip|yes|sure)(?:\s+(?:dong|deh|ya|aja|banget))?|(?:boleh|coba|iya|ya|mau)\s+(?:jelasin|jelaskan|terangkan)(?:\s+(?:dong|deh|ya|aja))?|(?:jelasin|jelaskan)(?:\s+(?:dong|aja|ya))?)[.!?]*$/iu;
const EXPLANATION_OFFER = /(?:mau|ingin).{0,100}(?:jelaskan|penjelasan|analogi)|(?:jelaskan|penjelasan).{0,100}(?:analogi|materi)/iu;
const CONTINUATION = /^(?:(?:apa\s+)?maksud(?:nya)?|contoh(?:nya)?|kenapa|mengapa|gimana|bagaimana|terus|lanjut|lebih sederhana|lebih simpel|lebih detail|detail(?:nya)?|jelasin lagi|jelaskan lagi|ulang(?:i)?|yang tadi|itu apa|yang pertama|poin pertama)(?:\s+.{1,100})?[.!?]*$/iu;

function isShortFollowUp(message) {
  return ACCEPTANCE.test(message) || CONTINUATION.test(message);
}

function resolveAcceptedExplanation(message, history = []) {
  if (typeof message !== 'string') return null;
  const cleanedMessage = message.trim();
  const acceptsOffer = ACCEPTANCE.test(cleanedMessage);
  const asksContextualFollowUp = CONTINUATION.test(cleanedMessage);
  if (!acceptsOffer && !asksContextualFollowUp) return null;
  if (!Array.isArray(history)) return null;
  const lastAssistant = [...history].reverse().find((turn) => turn?.role === 'model' && typeof turn.text === 'string');
  if (!lastAssistant || (acceptsOffer && !EXPLANATION_OFFER.test(lastAssistant.text))) return null;
  const previousQuestion = [...history].reverse().find((turn) => turn?.role === 'user'
    && typeof turn.text === 'string'
    && turn.text.trim()
    && !isShortFollowUp(turn.text.trim()));
  if (!previousQuestion) return null;
  const explanationIntent = acceptsOffer && EXPLANATION_OFFER.test(lastAssistant.text);
  return {
    contextQuestion: previousQuestion.text.trim(),
    generationQuestion: explanationIntent
      ? `Jelaskan dengan analogi sederhana topik dari pertanyaan siswa sebelumnya: ${previousQuestion.text.trim()}`
      : `Jawab pertanyaan lanjutan siswa “${cleanedMessage}” dengan konteks topik dari pertanyaan sebelumnya: ${previousQuestion.text.trim()}`,
    kind: explanationIntent ? 'accepted-explanation' : 'contextual-follow-up',
  };
}

module.exports = { resolveAcceptedExplanation, isShortFollowUp };
