import { normalizeAnalysis } from './rules.js';

// Quatre cas, quatre messages : une équipe qui découvre le projet ne reçoit pas le même courrier
// qu'une équipe dont les règles ont bougé, et une équipe qui n'est plus concernée doit l'apprendre
// au lieu de disparaître en silence avec un avis devenu caduc. Le quatrième cas est le plus
// important : une équipe que rien ne concerne dans cette mise à jour ne reçoit rien du tout.
export const PERIMETER_ADDED = 'added';
export const PERIMETER_CHANGED = 'changed';
export const PERIMETER_REMOVED = 'removed';
export const PERIMETER_UNCHANGED = 'unchanged';

const readTeamFingerprint = (analysis, teamId) => {
  const triggeredRuleIds = (Array.isArray(analysis.triggeredRules) ? analysis.triggeredRules : [])
    .filter((rule) => Array.isArray(rule?.teams) && rule.teams.includes(teamId))
    .map((rule) => rule?.id)
    .filter((id) => typeof id === 'string')
    .sort();

  const questions = analysis.questions && typeof analysis.questions === 'object'
    ? analysis.questions[teamId]
    : null;

  return JSON.stringify({
    triggeredRuleIds,
    questions: Array.isArray(questions) ? questions : [],
    notified: Array.isArray(analysis.notifiedTeams) ? analysis.notifiedTeams.includes(teamId) : false
  });
};

// Comparer des analyses et non des réponses : c'est le moteur de règles qui décide de ce qui
// concerne une équipe, et lui seul voit les cases à cocher annexes, les unités et le périmètre
// d'activité que le diff lisible ne montre pas.
export const computePerimeterImpact = (previousAnalysis, nextAnalysis) => {
  const before = normalizeAnalysis(previousAnalysis);
  const after = normalizeAnalysis(nextAnalysis);

  const beforeTeams = new Set(before.teams);
  const afterTeams = new Set(after.teams);
  const allTeams = Array.from(new Set([...before.teams, ...after.teams]));

  const byTeam = {};
  const added = [];
  const changed = [];
  const removed = [];
  const unchanged = [];

  allTeams.forEach((teamId) => {
    if (!beforeTeams.has(teamId)) {
      byTeam[teamId] = PERIMETER_ADDED;
      added.push(teamId);
      return;
    }

    if (!afterTeams.has(teamId)) {
      byTeam[teamId] = PERIMETER_REMOVED;
      removed.push(teamId);
      return;
    }

    if (readTeamFingerprint(before, teamId) !== readTeamFingerprint(after, teamId)) {
      byTeam[teamId] = PERIMETER_CHANGED;
      changed.push(teamId);
      return;
    }

    byTeam[teamId] = PERIMETER_UNCHANGED;
    unchanged.push(teamId);
  });

  return {
    byTeam,
    added,
    changed,
    removed,
    unchanged,
    // Un saut de niveau de risque concerne tout le monde : il change ce que le projet est, pas
    // seulement ce qu'une équipe doit regarder.
    riskLevelChanged: before.complexity !== after.complexity,
    hasImpact: added.length > 0 || changed.length > 0 || removed.length > 0
  };
};

// Les équipes à prévenir d'une mise à jour, hors équipes nouvellement déclenchées : celles-là
// reçoivent la sollicitation initiale, pas un diff sur un projet dont elles n'ont jamais entendu
// parler.
export const getTeamsToNotifyOfUpdate = (impact) => ({
  firstSolicitation: impact.added,
  reReview: impact.changed,
  noLongerConcerned: impact.removed
});
