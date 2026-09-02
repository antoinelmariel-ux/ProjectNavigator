const questionMatchesProjectNameHeuristic = (questionText) => {
  const candidates = typeof questionText === 'string'
    ? [questionText]
    : questionText && typeof questionText === 'object'
      ? Object.values(questionText).filter((value) => typeof value === 'string')
      : [];

  return candidates.some((candidate) => {
    const text = candidate.toLowerCase();
    return (
      (text.includes('nom') && text.includes('projet')) ||
      (text.includes('name') && text.includes('project'))
    );
  });
};

export const extractProjectName = (answers, questions) => {
  if (!answers || !questions) {
    return '';
  }

  const preferredKeys = ['projectName', 'project_name', 'nomProjet', 'nom_projet'];

  for (const key of preferredKeys) {
    const value = answers[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  const matchingQuestion = questions.find(question => {
    if (!question || !question.question) {
      return false;
    }

    return (
      questionMatchesProjectNameHeuristic(question.question) &&
      typeof answers[question.id] === 'string' &&
      answers[question.id].trim() !== ''
    );
  });

  if (matchingQuestion) {
    return answers[matchingQuestion.id].trim();
  }

  return '';
};
