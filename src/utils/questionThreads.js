// Poser une question à un expert **là où le doute naît** — sur une question précise du
// questionnaire — sans avoir à soumettre quoi que ce soit. C'est le pendant conversationnel de
// l'entrée précoce : un porteur qui bute sur une question n'a pas besoin d'un dossier, il a
// besoin d'une réponse.
//
// Le fil ne réinvente pas « qui est concerné » : créer une question ajoute la même sollicitation
// manuelle d'équipe que la synthèse (`manualTeamRequests.js`), qui survit au recalcul de
// l'analyse et fait apparaître l'équipe comme un périmètre à part entière.
export const QUESTION_THREADS_KEY = '__question_threads__';

const toText = (value) => (typeof value === 'string' ? value : '');

const normalizeMessage = (message, index) => ({
  id: toText(message?.id) || `message-${index}`,
  authorEmail: toText(message?.authorEmail),
  authorName: toText(message?.authorName),
  message: toText(message?.message),
  at: toText(message?.at)
});

export const normalizeQuestionThreads = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce((acc, entry) => {
    const id = toText(entry?.id);
    const questionId = toText(entry?.questionId);
    const teamId = toText(entry?.teamId);

    if (!id || !questionId || !teamId) {
      return acc;
    }

    acc.push({
      id,
      questionId,
      teamId,
      createdBy: toText(entry?.createdBy),
      createdAt: toText(entry?.createdAt),
      resolvedBy: toText(entry?.resolvedBy),
      resolvedAt: toText(entry?.resolvedAt),
      messages: Array.isArray(entry?.messages)
        ? entry.messages.map(normalizeMessage).filter((message) => message.message.trim().length > 0)
        : []
    });

    return acc;
  }, []);
};

export const getQuestionThreads = (answers) =>
  normalizeQuestionThreads(answers && typeof answers === 'object' ? answers[QUESTION_THREADS_KEY] : null);

export const getThreadsForQuestion = (answers, questionId) =>
  getQuestionThreads(answers).filter((thread) => thread.questionId === questionId);

export const getThreadsForTeam = (answers, teamId) =>
  getQuestionThreads(answers).filter((thread) => thread.teamId === teamId);

// Une question sans réponse est ce qui compte pour le porteur comme pour l'expert : c'est ce
// nombre qui s'affiche sur la question du questionnaire et sur la carte d'équipe.
export const isThreadAwaitingAnswer = (thread) => {
  if (!thread || thread.resolvedAt) {
    return false;
  }

  return thread.messages.length <= 1;
};

export const countUnresolvedThreads = (answers, predicate = () => true) =>
  getQuestionThreads(answers).filter((thread) => !thread.resolvedAt && predicate(thread)).length;

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const addQuestionThread = (answers, { questionId, teamId, message, authorEmail = '', authorName = '', at } = {}) => {
  const normalizedQuestionId = toText(questionId).trim();
  const normalizedTeamId = toText(teamId).trim();
  const normalizedMessage = toText(message).trim();

  if (!normalizedQuestionId || !normalizedTeamId || normalizedMessage.length === 0) {
    return null;
  }

  const createdAt = toText(at) || new Date().toISOString();
  const threadId = buildId('question-thread');

  return {
    id: threadId,
    questionId: normalizedQuestionId,
    teamId: normalizedTeamId,
    createdBy: authorEmail,
    createdAt,
    resolvedBy: '',
    resolvedAt: '',
    messages: [{
      id: buildId('message'),
      authorEmail,
      authorName,
      message: normalizedMessage,
      at: createdAt
    }]
  };
};

export const withQuestionThread = (answers, thread) => {
  if (!thread) {
    return answers;
  }

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [QUESTION_THREADS_KEY]: [...getQuestionThreads(answers), thread]
  };
};

const patchThread = (answers, threadId, patch) => {
  const threads = getQuestionThreads(answers);
  const index = threads.findIndex((thread) => thread.id === threadId);

  if (index === -1) {
    return answers;
  }

  const next = threads.slice();
  next[index] = patch(next[index]);

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [QUESTION_THREADS_KEY]: next
  };
};

export const withThreadReply = (answers, threadId, { message, authorEmail = '', authorName = '', at } = {}) => {
  const normalizedMessage = toText(message).trim();
  if (normalizedMessage.length === 0) {
    return answers;
  }

  return patchThread(answers, threadId, (thread) => ({
    ...thread,
    messages: [...thread.messages, {
      id: buildId('message'),
      authorEmail,
      authorName,
      message: normalizedMessage,
      at: toText(at) || new Date().toISOString()
    }]
  }));
};

// Clore une question est réservé à qui l'a posée : un expert qui répond n'a pas à décider que
// la réponse a suffi.
export const withThreadResolution = (answers, threadId, { resolved, by = '', at } = {}) =>
  patchThread(answers, threadId, (thread) => ({
    ...thread,
    resolvedBy: resolved ? by : '',
    resolvedAt: resolved ? (toText(at) || new Date().toISOString()) : ''
  }));
