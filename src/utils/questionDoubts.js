// « J'ai un doute » est une note attachée à une question, jamais la réponse elle-même : le
// porteur donne sa vraie réponse et signale en plus, avec un texte libre, qu'il n'en est pas
// sûr. Contrairement à l'ancienne réponse sentinelle qu'elle remplace, cette note ne change
// jamais ce que voit le moteur de règles — un avis technique peut porter sur une réponse
// douteuse, seule la validation définitive exige que le doute soit levé (cf. mandatoryQuestions.js).
export const QUESTION_DOUBTS_KEY = '__question_doubts__';

const toText = (value) => (typeof value === 'string' ? value : '');

export const normalizeQuestionDoubts = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.keys(value).reduce((acc, questionId) => {
    const id = toText(questionId).trim();
    if (!id) {
      return acc;
    }

    const entry = value[questionId];
    acc[id] = { text: toText(entry && typeof entry === 'object' ? entry.text : entry) };
    return acc;
  }, {});
};

export const getQuestionDoubts = (answers) =>
  normalizeQuestionDoubts(answers && typeof answers === 'object' ? answers[QUESTION_DOUBTS_KEY] : null);

export const hasQuestionDoubt = (answers, questionId) => Boolean(getQuestionDoubts(answers)[questionId]);

export const getQuestionDoubtText = (answers, questionId) =>
  getQuestionDoubts(answers)[questionId]?.text || '';

export const withQuestionDoubt = (answers, questionId, text = '') => {
  const id = toText(questionId).trim();
  if (!id) {
    return answers;
  }

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [QUESTION_DOUBTS_KEY]: {
      ...getQuestionDoubts(answers),
      [id]: { text: toText(text) }
    }
  };
};

export const withoutQuestionDoubt = (answers, questionId) => {
  const id = toText(questionId).trim();
  const current = getQuestionDoubts(answers);
  if (!id || !current[id]) {
    return answers;
  }

  const next = { ...current };
  delete next[id];

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [QUESTION_DOUBTS_KEY]: next
  };
};

// Types où le doute est une information utile pour la compliance : ce sont ceux que le moteur de
// règles lit. Les champs narratifs (nom, description, bénéfices) en sont exclus par défaut — ce
// qu'on attend d'eux, c'est le texte lui-même.
const DOUBT_FRIENDLY_TYPES = ['choice', 'multi_choice', 'number', 'date'];

export const canQuestionHaveDoubt = (question) => {
  if (!question || typeof question !== 'object') {
    return false;
  }

  if (typeof question.allowUnknownAnswer === 'boolean') {
    return question.allowUnknownAnswer;
  }

  return DOUBT_FRIENDLY_TYPES.includes(question.type);
};

// Pour le récapitulatif « Rappel de vos réponses » et le panneau de complétude : la liste des
// doutes encore ouverts, avec la question et le texte associés. Un doute n'est plus jamais
// transmis à une équipe, donc rien ici ne parle de destinataire.
export const getOpenQuestionDoubts = (answers, questions = []) => {
  const doubts = getQuestionDoubts(answers);
  const doubtIds = Object.keys(doubts);
  if (doubtIds.length === 0) {
    return [];
  }

  const questionById = new Map(
    (Array.isArray(questions) ? questions : [])
      .filter((question) => question && question.id)
      .map((question) => [question.id, question])
  );

  return doubtIds
    .filter((questionId) => questionById.has(questionId))
    .map((questionId) => ({
      questionId,
      question: questionById.get(questionId),
      text: doubts[questionId].text
    }));
};
