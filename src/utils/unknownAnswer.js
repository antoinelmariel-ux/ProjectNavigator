// « Je ne sais pas encore » est une réponse à part entière, jamais un vide : le porteur peut
// avancer sans mentir, l'expert lit une incertitude assumée plutôt qu'un oubli, et le moteur
// de règles sait que la question reste ouverte. La valeur est une sentinelle stockée comme une
// réponse ordinaire, mais aucune condition ne la satisfait jamais (cf. questions.js) — y
// compris les conditions négatives, sans quoi un « je ne sais pas » déclencherait des règles
// par défaut.
export const UNKNOWN_ANSWER_VALUE = '__unknown__';

export const isUnknownAnswer = (value) => {
  if (value === UNKNOWN_ANSWER_VALUE) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 1 && value[0] === UNKNOWN_ANSWER_VALUE;
  }

  if (value && typeof value === 'object' && typeof value.value !== 'undefined') {
    return value.value === UNKNOWN_ANSWER_VALUE;
  }

  return false;
};

// Types où l'incertitude est une information utile : ce sont ceux que le moteur de règles lit.
// Les champs narratifs (nom, description, bénéfices) en sont exclus par défaut — ce qu'on
// attend d'eux, c'est justement le texte, et « je ne sais pas » y serait un contournement.
const UNKNOWN_FRIENDLY_TYPES = ['choice', 'multi_choice', 'number', 'date'];

export const canAnswerBeUnknown = (question) => {
  if (!question || typeof question !== 'object') {
    return false;
  }

  if (typeof question.allowUnknownAnswer === 'boolean') {
    return question.allowUnknownAnswer;
  }

  return UNKNOWN_FRIENDLY_TYPES.includes(question.type);
};
