import { applyRuleConditionGroups, normalizeRuleConditionGroups } from './ruleConditions.js';
import { evaluateRule } from './rules.js';
import { normalizeEmail } from './normalizeEmail.js';
import { normalizeTeamContacts } from './teamContacts.js';

// Une équipe experte à plusieurs membres peut router chaque sollicitation : un membre porte
// soit des critères de déclenchement (« uniquement si… »), soit des critères d'exclusion
// (« sauf si… »), soit un blocage inconditionnel (« jamais »). Un membre sans critère est
// toujours déclenché — c'est le comportement historique, et c'est aussi ce qui garantit qu'au
// moins une personne est sollicitée quelles que soient les réponses (cf.
// hasUnconditionalTeamMember / getTeamMemberCoverageWarning).
export const MEMBER_TRIGGER_MODE_INCLUDE = 'include';
export const MEMBER_TRIGGER_MODE_EXCLUDE = 'exclude';
// Contrairement à include/exclude, ce mode ne dépend d'aucune condition : le membre garde son
// accès (contacts inchangés, cf. resolveTeamRecipients vs normalizeTeamContacts) mais ne reçoit
// plus jamais aucune sollicitation de l'équipe.
export const MEMBER_TRIGGER_MODE_NEVER = 'never';

export const MEMBER_TRIGGER_MODES = [
  MEMBER_TRIGGER_MODE_INCLUDE,
  MEMBER_TRIGGER_MODE_EXCLUDE,
  MEMBER_TRIGGER_MODE_NEVER
];

const normalizeMode = (mode) => {
  if (mode === MEMBER_TRIGGER_MODE_EXCLUDE || mode === MEMBER_TRIGGER_MODE_NEVER) {
    return mode;
  }
  return MEMBER_TRIGGER_MODE_INCLUDE;
};

// Un mode « jamais » n'a besoin d'aucune condition pour être une règle réelle — contrairement à
// include/exclude, que normalizeTeamMemberRules efface s'ils n'en portent aucune.
const isMemberRuleMeaningful = (rule) =>
  rule?.mode === MEMBER_TRIGGER_MODE_NEVER || hasMemberConditions(rule);

// `normalizeRuleConditionGroups` retombe sur le champ plat `conditions` quand `conditionGroups`
// est vide : ici ce serait un piège, car vider les groupes depuis le back-office ressusciterait
// le miroir hérité. Un tableau `conditionGroups` présent fait donc autorité, vide compris.
const resolveMemberConditionGroups = (entry = {}) =>
  Array.isArray(entry?.conditionGroups)
    ? normalizeRuleConditionGroups({ conditionGroups: entry.conditionGroups })
    : normalizeRuleConditionGroups(entry);

export const sanitizeTeamMemberRule = (entry = {}) => {
  const email = typeof entry?.email === 'string' ? entry.email.trim() : '';
  const conditionGroups = resolveMemberConditionGroups(entry);

  return applyRuleConditionGroups(
    {
      email,
      mode: normalizeMode(entry?.mode)
    },
    conditionGroups
  );
};

export const hasMemberConditions = (rule) =>
  resolveMemberConditionGroups(rule).some((group) => group.conditions.length > 0);

// Une règle orpheline (membre retiré de l'équipe) est écartée : la conserver ferait revivre des
// critères invisibles dans le back-office si la même adresse était réintroduite plus tard.
export const normalizeTeamMemberRules = (team) => {
  const contacts = normalizeTeamContacts(team);
  const knownEmails = new Set(contacts.map((contact) => normalizeEmail(contact)));
  const rawRules = Array.isArray(team?.memberRules) ? team.memberRules : [];
  const seen = new Set();

  return rawRules
    .map((entry) => sanitizeTeamMemberRule(entry))
    .filter((entry) => {
      const key = normalizeEmail(entry.email);
      if (!key || !knownEmails.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return isMemberRuleMeaningful(entry);
    });
};

export const getTeamMemberRule = (team, email) => {
  const key = normalizeEmail(email);
  if (!key) {
    return null;
  }
  return normalizeTeamMemberRules(team).find((entry) => normalizeEmail(entry.email) === key) || null;
};

export const isTeamMemberTriggered = (rule, answers = {}) => {
  if (!rule) {
    return true;
  }
  if (rule.mode === MEMBER_TRIGGER_MODE_NEVER) {
    return false;
  }
  if (!hasMemberConditions(rule)) {
    return true;
  }

  const { triggered } = evaluateRule({ ...rule, conditionGroups: resolveMemberConditionGroups(rule) }, answers);
  return rule.mode === MEMBER_TRIGGER_MODE_EXCLUDE ? !triggered : triggered;
};

// Les destinataires réels d'une équipe pour un projet donné. Sans critère, on retombe exactement
// sur normalizeTeamContacts (tous les contacts), ce qui garde le comportement d'avant.
export const resolveTeamRecipients = (team, answers = {}) => {
  const rulesByEmail = new Map(
    normalizeTeamMemberRules(team).map((entry) => [normalizeEmail(entry.email), entry])
  );

  if (rulesByEmail.size === 0) {
    return normalizeTeamContacts(team);
  }

  return normalizeTeamContacts(team).filter((contact) =>
    isTeamMemberTriggered(rulesByEmail.get(normalizeEmail(contact)) || null, answers)
  );
};

// « Au moins une personne sera sollicitée quoi qu'il arrive » : vrai dès qu'un contact n'a
// aucun critère. Avec uniquement des membres conditionnés, il existe toujours un jeu de réponses
// pour lequel l'équipe ne notifie personne — d'où l'avertissement du back-office.
export const hasUnconditionalTeamMember = (team) => {
  const contacts = normalizeTeamContacts(team);
  if (contacts.length === 0) {
    return false;
  }

  const conditionedEmails = new Set(
    normalizeTeamMemberRules(team).map((entry) => normalizeEmail(entry.email))
  );

  return contacts.some((contact) => !conditionedEmails.has(normalizeEmail(contact)));
};

export const TEAM_MEMBER_COVERAGE_OK = 'ok';
export const TEAM_MEMBER_COVERAGE_NO_MEMBER = 'noMember';
export const TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL = 'allConditional';

export const getTeamMemberCoverageWarning = (team) => {
  const contacts = normalizeTeamContacts(team);
  if (contacts.length === 0) {
    return TEAM_MEMBER_COVERAGE_NO_MEMBER;
  }

  return hasUnconditionalTeamMember(team) ? TEAM_MEMBER_COVERAGE_OK : TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL;
};

export const applyTeamMemberRule = (team, email, updater) => {
  const key = normalizeEmail(email);
  if (!key) {
    return team;
  }

  const current = getTeamMemberRule(team, email) || sanitizeTeamMemberRule({ email });
  const next = sanitizeTeamMemberRule(typeof updater === 'function' ? updater(current) : updater);
  const others = normalizeTeamMemberRules(team).filter((entry) => normalizeEmail(entry.email) !== key);
  const memberRules = isMemberRuleMeaningful(next)
    ? [...others, { ...next, email: current.email || email }]
    : others;

  return { ...team, memberRules };
};

// Réattribuer les critères d'un membre à un autre libère le premier : il repasse « toujours
// sollicité », ce qui suffit à rétablir la couverture de l'équipe (cf. hasUnconditionalTeamMember).
// C'est la sortie proposée par l'avertissement du back-office quand plus personne n'est sollicité
// systématiquement.
export const reassignTeamMemberRule = (team, fromEmail, toEmail) => {
  const fromKey = normalizeEmail(fromEmail);
  const toKey = normalizeEmail(toEmail);

  if (!fromKey || !toKey || fromKey === toKey) {
    return team;
  }

  const contactKeys = new Set(normalizeTeamContacts(team).map((contact) => normalizeEmail(contact)));
  if (!contactKeys.has(toKey)) {
    return team;
  }

  const movedRule = getTeamMemberRule(team, fromEmail);
  if (!movedRule) {
    return team;
  }

  const targetEmail = normalizeTeamContacts(team).find((contact) => normalizeEmail(contact) === toKey);
  // Réinitialiser aussi le mode, pas seulement les groupes : un mode « jamais » reste
  // significatif même sans condition (cf. isMemberRuleMeaningful), donc ne vider que
  // conditionGroups laisserait la source bloquée après la réattribution.
  const withoutSource = applyTeamMemberRule(team, fromEmail, (current) => ({
    ...current,
    mode: MEMBER_TRIGGER_MODE_INCLUDE,
    conditionGroups: []
  }));

  return applyTeamMemberRule(withoutSource, targetEmail, () => ({
    email: targetEmail,
    mode: movedRule.mode,
    conditionGroups: normalizeRuleConditionGroups(movedRule)
  }));
};
