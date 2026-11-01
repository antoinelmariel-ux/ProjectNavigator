// Calendrier des comités (docs/specs/calendrier-comites.md). Une séance est un temps à répartir,
// pas une grille de créneaux : les passages s'enchaînent depuis l'heure de début, dans l'ordre de
// l'ordre du jour, et c'est la somme de leurs durées qui dit s'il reste de la place. Tout ce
// module est pur : App.jsx l'applique à l'état local ou, en mode SharePoint, à la ligne relue
// juste avant l'écriture (voir committeeSessionsProvider.js), si bien que deux inscriptions
// simultanées sont départagées sur le temps réellement restant.

export const SESSION_STATUS_DRAFT = 'draft';
export const SESSION_STATUS_PUBLISHED = 'published';
export const SESSION_STATUS_CANCELLED = 'cancelled';
const SESSION_STATUSES = [SESSION_STATUS_DRAFT, SESSION_STATUS_PUBLISHED, SESSION_STATUS_CANCELLED];

export const DEFAULT_SESSION_MINUTES = 60;
export const DEFAULT_PASSAGE_MINUTES = 20;
export const MIN_PASSAGE_MINUTES = 10;
export const PASSAGE_STEP_MINUTES = 5;
export const BOOKING_CUTOFF_DAYS = 3;
export const PLANNING_REMINDER_DAYS = 28;
export const OWNER_REMINDER_DAYS = [7, 1];

export const ATTENDANCE_PRESENT = 'present';
export const ATTENDANCE_EXCUSED = 'excused';
export const ATTENDANCE_ABSENT = 'absent';
export const ATTENDANCE_STATES = [ATTENDANCE_PRESENT, ATTENDANCE_EXCUSED, ATTENDANCE_ABSENT];

// Un passage est soit la présentation d'un projet, soit un sujet libre que le président met à
// l'ordre du jour (point d'information, retour d'expérience…) : il prend du temps de séance comme
// un projet, mais n'a ni porteur, ni invitation, ni présences propres.
export const PASSAGE_KIND_PROJECT = 'project';
export const PASSAGE_KIND_TOPIC = 'topic';

export const TIME_REQUEST_PENDING = 'pending';
export const TIME_REQUEST_ACCEPTED = 'accepted';
export const TIME_REQUEST_REFUSED = 'refused';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const toText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => toText(value).toLowerCase();
const toIso = (value) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
const toTime = (value) => {
  const iso = toIso(value);
  return iso ? new Date(iso).getTime() : NaN;
};
const toPositiveMinutes = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
};

const randomSuffix = () => Math.random().toString(36).slice(2, 8);
export const createSessionId = () => `session-${Date.now().toString(36)}-${randomSuffix()}`;
export const createPassageId = () => `passage-${Date.now().toString(36)}-${randomSuffix()}`;

export const normalizePassageMinutes = (value, fallback = DEFAULT_PASSAGE_MINUTES) => {
  const minutes = toPositiveMinutes(value, fallback);
  const stepped = Math.round(minutes / PASSAGE_STEP_MINUTES) * PASSAGE_STEP_MINUTES;
  return Math.max(MIN_PASSAGE_MINUTES, stepped);
};

const normalizeEmails = (value) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  return list
    .map(normalizeEmail)
    .filter((email) => email.length > 0 && !seen.has(email) && seen.add(email));
};

const normalizeAttendanceMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value).reduce((acc, [email, state]) => {
    const key = normalizeEmail(email);
    if (key && ATTENDANCE_STATES.includes(state)) {
      acc[key] = state;
    }
    return acc;
  }, {});
};

const normalizeTimeRequest = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const status = [TIME_REQUEST_PENDING, TIME_REQUEST_ACCEPTED, TIME_REQUEST_REFUSED].includes(value.status)
    ? value.status
    : TIME_REQUEST_PENDING;
  const minutes = toPositiveMinutes(value.minutes, 0);
  if (minutes === 0) {
    return null;
  }
  return {
    minutes,
    heldMinutes: Math.min(minutes, Math.max(0, Math.round(Number(value.heldMinutes) || 0))),
    note: toText(value.note),
    status,
    requestedBy: normalizeEmail(value.requestedBy),
    requestedAt: toIso(value.requestedAt),
    decidedBy: normalizeEmail(value.decidedBy),
    decidedAt: toIso(value.decidedAt)
  };
};

export const normalizePassage = (value = {}) => {
  const representation = value?.representationRequest && typeof value.representationRequest === 'object'
    ? { by: normalizeEmail(value.representationRequest.by), at: toIso(value.representationRequest.at) }
    : null;
  const kind = value?.kind === PASSAGE_KIND_TOPIC ? PASSAGE_KIND_TOPIC : PASSAGE_KIND_PROJECT;
  return {
    id: toText(value?.id) || createPassageId(),
    kind,
    projectId: kind === PASSAGE_KIND_TOPIC ? '' : toText(value?.projectId),
    title: kind === PASSAGE_KIND_TOPIC ? toText(value?.title) : '',
    presenter: kind === PASSAGE_KIND_TOPIC ? toText(value?.presenter) : '',
    note: kind === PASSAGE_KIND_TOPIC ? toText(value?.note) : '',
    minutes: normalizePassageMinutes(value?.minutes),
    guests: normalizeEmails(value?.guests),
    bookedBy: normalizeEmail(value?.bookedBy),
    bookedAt: toIso(value?.bookedAt),
    timeRequest: normalizeTimeRequest(value?.timeRequest),
    attendanceOverride: normalizeAttendanceMap(value?.attendanceOverride),
    representationRequest: representation && representation.at ? representation : null,
    remindersSent: Array.isArray(value?.remindersSent)
      ? value.remindersSent.filter((entry) => typeof entry === 'string')
      : []
  };
};

export const normalizeSession = (value = {}) => ({
  id: toText(value?.id) || createSessionId(),
  committeeId: toText(value?.committeeId),
  startAt: toIso(value?.startAt),
  durationMinutes: toPositiveMinutes(value?.durationMinutes, DEFAULT_SESSION_MINUTES),
  location: toText(value?.location),
  status: SESSION_STATUSES.includes(value?.status) ? value.status : SESSION_STATUS_DRAFT,
  agenda: (Array.isArray(value?.agenda) ? value.agenda : [])
    .map(normalizePassage)
    .filter((passage) => (passage.kind === PASSAGE_KIND_TOPIC ? passage.title.length > 0 : passage.projectId.length > 0)),
  attendance: normalizeAttendanceMap(value?.attendance),
  planningReminderSentAt: toIso(value?.planningReminderSentAt),
  updatedAt: toIso(value?.updatedAt),
  updatedBy: normalizeEmail(value?.updatedBy)
});

export const normalizeSessions = (value) =>
  (Array.isArray(value) ? value : [])
    .map(normalizeSession)
    .filter((session) => session.committeeId && session.startAt)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

// ——— Comité ———

export const getCommitteeDefaultPassageMinutes = (committee) =>
  normalizePassageMinutes(committee?.defaultPassageMinutes, DEFAULT_PASSAGE_MINUTES);

export const getCommitteeChairEmails = (committee) =>
  normalizeEmails([committee?.presidentEmail, committee?.vicePresidentEmail]);

export const isCommitteeChair = (committee, email) => {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && getCommitteeChairEmails(committee).includes(normalized);
};

export const getCommitteeMemberEmails = (committee) => normalizeEmails(committee?.emails);

// ——— Temps ———

const getPassageScheduledMinutes = (passage) => {
  const held = passage.timeRequest?.status === TIME_REQUEST_PENDING ? passage.timeRequest.heldMinutes : 0;
  return passage.minutes + held;
};

export const getAllocatedMinutes = (session) =>
  normalizeSession(session).agenda.reduce((total, passage) => total + getPassageScheduledMinutes(passage), 0);

export const getRemainingMinutes = (session) => {
  const normalized = normalizeSession(session);
  return normalized.durationMinutes - getAllocatedMinutes(normalized);
};

export const getSessionEndAt = (session) => {
  const normalized = normalizeSession(session);
  const start = toTime(normalized.startAt);
  return Number.isNaN(start) ? '' : new Date(start + normalized.durationMinutes * MINUTE_MS).toISOString();
};

export const buildSessionTimeline = (session) => {
  const normalized = normalizeSession(session);
  let cursor = toTime(normalized.startAt);
  return normalized.agenda.map((passage, index) => {
    const startAt = new Date(cursor).toISOString();
    cursor += getPassageScheduledMinutes(passage) * MINUTE_MS;
    return { passage, index, number: index + 1, startAt, endAt: new Date(cursor).toISOString() };
  });
};

const startOfDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const getDaysUntilSession = (session, now = new Date()) => {
  const start = toTime(session?.startAt);
  if (Number.isNaN(start)) {
    return -Infinity;
  }
  return Math.round((startOfDay(start) - startOfDay(toTime(now))) / DAY_MS);
};

export const isSessionPast = (session, now = new Date()) => {
  const end = toTime(getSessionEndAt(session));
  return !Number.isNaN(end) && end <= toTime(now);
};

export const hasSessionStarted = (session, now = new Date()) => {
  const start = toTime(session?.startAt);
  return !Number.isNaN(start) && start <= toTime(now);
};

// Une séance proposée au chef de projet : publiée, à J-3 au moins, et avec encore au moins la
// durée par défaut d'un passage. Une séance pleine ou trop proche n'est pas proposée du tout.
export const isSessionBookableByOwner = (session, committee, now = new Date()) => {
  const normalized = normalizeSession(session);
  return normalized.status === SESSION_STATUS_PUBLISHED
    && getDaysUntilSession(normalized, now) >= BOOKING_CUTOFF_DAYS
    && getRemainingMinutes(normalized) >= getCommitteeDefaultPassageMinutes(committee);
};

export const getBookableSessions = (sessions, committee, now = new Date(), { excludeSessionId = '' } = {}) =>
  normalizeSessions(sessions).filter((session) => session.committeeId === committee?.id
    && session.id !== excludeSessionId
    && isSessionBookableByOwner(session, committee, now));

// ——— Passages d'un projet ———

export const getProjectPassages = (sessions, projectId, committeeId, now = new Date()) =>
  normalizeSessions(sessions)
    .filter((session) => session.committeeId === committeeId && session.status !== SESSION_STATUS_CANCELLED)
    .flatMap((session) => buildSessionTimeline(session)
      .filter((slot) => slot.passage.projectId === projectId)
      .map((slot) => ({ ...slot, session, isPast: isSessionPast(session, now), hasStarted: hasSessionStarted(session, now) })))
    .map((entry, index) => ({ ...entry, passageNumber: index + 1 }));

export const getUpcomingProjectPassage = (sessions, projectId, committeeId, now = new Date()) =>
  getProjectPassages(sessions, projectId, committeeId, now).find((entry) => !entry.isPast) || null;

// Le dernier passage tenu, s'il a donné lieu à une demande de nouveau passage encore sans suite.
export const getPendingRepresentationRequest = (sessions, projectId, committeeId, now = new Date()) => {
  const passages = getProjectPassages(sessions, projectId, committeeId, now);
  if (passages.some((entry) => !entry.isPast)) {
    return null;
  }
  const last = passages[passages.length - 1];
  return last?.passage.representationRequest ? { ...last.passage.representationRequest, session: last.session } : null;
};

// La séance à laquelle rattacher un avis rendu maintenant : celle du dernier passage déjà
// commencé (on rend l'avis pendant ou après la séance, jamais avant).
export const getCurrentPassageSessionId = (sessions, projectId, committeeId, now = new Date()) => {
  const started = getProjectPassages(sessions, projectId, committeeId, now).filter((entry) => entry.hasStarted);
  return started.length > 0 ? started[started.length - 1].session.id : '';
};

// ——— Présences ———

export const getPassageAttendance = (session, passage) => ({
  ...normalizeAttendanceMap(session?.attendance),
  ...normalizeAttendanceMap(passage?.attendanceOverride)
});

export const summarizeAttendance = (memberEmails, attendance) => {
  const members = normalizeEmails(memberEmails);
  const map = normalizeAttendanceMap(attendance);
  return members.reduce((acc, email) => {
    const state = map[email];
    if (state) {
      acc[state] += 1;
    } else {
      acc.unknown += 1;
    }
    return acc;
  }, { [ATTENDANCE_PRESENT]: 0, [ATTENDANCE_EXCUSED]: 0, [ATTENDANCE_ABSENT]: 0, unknown: 0, total: members.length });
};

// ——— Actions ———

const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

const withAgenda = (session, agenda) => ({ ...session, agenda });

const updatePassage = (session, passageId, updater) => {
  let found = false;
  const agenda = session.agenda.map((passage) => {
    if (passage.id !== passageId) {
      return passage;
    }
    found = true;
    return normalizePassage(updater(passage));
  });
  return found ? withAgenda(session, agenda) : null;
};

// Une action du président qui ferait dépasser la séance est refusée tant qu'il ne l'a pas
// confirmée ; confirmée, elle prolonge la séance d'autant (spec §4).
const settleDuration = (session, { allowOverrun }) => {
  const overrunMinutes = getAllocatedMinutes(session) - session.durationMinutes;
  if (overrunMinutes <= 0) {
    return { ok: true, session, extendedBy: 0 };
  }
  if (!allowOverrun) {
    return fail('overrun', { overrunMinutes });
  }
  return { ok: true, session: { ...session, durationMinutes: session.durationMinutes + overrunMinutes }, extendedBy: overrunMinutes };
};

const stamp = (session, actor, now) => ({ ...session, updatedAt: toIso(now), updatedBy: normalizeEmail(actor) });

export const applySessionAction = (rawSession, action = {}, context = {}) => {
  const now = context.now || new Date();
  const actor = normalizeEmail(context.actorEmail);
  const isChair = context.isChair === true;
  const session = normalizeSession(rawSession);
  const done = (result) => (result.ok ? { ...result, session: stamp(result.session, actor, now) } : result);

  switch (action.type) {
    case 'book': {
      const projectId = toText(action.projectId);
      if (!projectId) {
        return fail('invalid');
      }
      if (session.status === SESSION_STATUS_CANCELLED) {
        return fail('cancelled');
      }
      const minutes = normalizePassageMinutes(action.minutes, normalizePassageMinutes(context.defaultPassageMinutes));
      if (!isChair) {
        if (session.status !== SESSION_STATUS_PUBLISHED || getDaysUntilSession(session, now) < BOOKING_CUTOFF_DAYS) {
          return fail('closed');
        }
        if (getRemainingMinutes(session) < minutes) {
          return fail('full');
        }
      }
      const passage = normalizePassage({
        id: action.passageId,
        projectId,
        minutes,
        guests: action.guests,
        bookedBy: actor,
        bookedAt: toIso(now)
      });
      return done(settleDuration(withAgenda(session, [...session.agenda, passage]), action));
    }
    case 'addTopic': {
      if (!isChair) {
        return fail('forbidden');
      }
      const title = toText(action.title);
      if (!title) {
        return fail('invalid');
      }
      if (session.status === SESSION_STATUS_CANCELLED) {
        return fail('cancelled');
      }
      const topic = normalizePassage({
        id: action.passageId,
        kind: PASSAGE_KIND_TOPIC,
        title,
        presenter: action.presenter,
        note: action.note,
        minutes: normalizePassageMinutes(action.minutes, MIN_PASSAGE_MINUTES),
        bookedBy: actor,
        bookedAt: toIso(now)
      });
      return done(settleDuration(withAgenda(session, [...session.agenda, topic]), action));
    }
    case 'updateTopic': {
      if (!isChair) {
        return fail('forbidden');
      }
      const target = session.agenda.find((passage) => passage.id === action.passageId);
      if (target?.kind !== PASSAGE_KIND_TOPIC) {
        return fail('notFound');
      }
      const patch = action.patch || {};
      if ('title' in patch && !toText(patch.title)) {
        return fail('invalid');
      }
      const next = updatePassage(session, action.passageId, (passage) => ({
        ...passage,
        ...('title' in patch ? { title: patch.title } : {}),
        ...('presenter' in patch ? { presenter: patch.presenter } : {}),
        ...('note' in patch ? { note: patch.note } : {})
      }));
      return done({ ok: true, session: next });
    }
    case 'unbook': {
      const agenda = session.agenda.filter((passage) => passage.id !== action.passageId);
      if (agenda.length === session.agenda.length) {
        return fail('notFound');
      }
      return done({ ok: true, session: withAgenda(session, agenda) });
    }
    case 'setGuests': {
      const next = updatePassage(session, action.passageId, (passage) => ({ ...passage, guests: action.guests }));
      return next ? done({ ok: true, session: next }) : fail('notFound');
    }
    case 'setMinutes': {
      if (!isChair) {
        return fail('forbidden');
      }
      const next = updatePassage(session, action.passageId, (passage) => ({ ...passage, minutes: action.minutes }));
      return next ? done(settleDuration(next, action)) : fail('notFound');
    }
    case 'reorder': {
      if (!isChair) {
        return fail('forbidden');
      }
      const index = session.agenda.findIndex((passage) => passage.id === action.passageId);
      const target = index + (action.direction === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= session.agenda.length) {
        return fail('notFound');
      }
      const agenda = session.agenda.slice();
      [agenda[index], agenda[target]] = [agenda[target], agenda[index]];
      return done({ ok: true, session: withAgenda(session, agenda) });
    }
    case 'requestTime': {
      const note = toText(action.note);
      if (!note) {
        return fail('noteRequired');
      }
      const remaining = Math.max(0, getRemainingMinutes(session));
      const minutes = toPositiveMinutes(action.minutes, remaining > 0 ? Math.min(DEFAULT_PASSAGE_MINUTES, remaining) : DEFAULT_PASSAGE_MINUTES);
      const next = updatePassage(session, action.passageId, (passage) => {
        const freed = passage.timeRequest?.status === TIME_REQUEST_PENDING ? passage.timeRequest.heldMinutes : 0;
        return {
          ...passage,
          timeRequest: {
            minutes,
            heldMinutes: Math.min(minutes, remaining + freed),
            note,
            status: TIME_REQUEST_PENDING,
            requestedBy: actor,
            requestedAt: toIso(now)
          }
        };
      });
      return next ? done({ ok: true, session: next }) : fail('notFound');
    }
    case 'decideTimeRequest': {
      if (!isChair) {
        return fail('forbidden');
      }
      const target = session.agenda.find((passage) => passage.id === action.passageId);
      if (!target?.timeRequest || target.timeRequest.status !== TIME_REQUEST_PENDING) {
        return fail('notFound');
      }
      const next = updatePassage(session, action.passageId, (passage) => ({
        ...passage,
        minutes: action.accept ? passage.minutes + passage.timeRequest.minutes : passage.minutes,
        timeRequest: {
          ...passage.timeRequest,
          heldMinutes: 0,
          status: action.accept ? TIME_REQUEST_ACCEPTED : TIME_REQUEST_REFUSED,
          decidedBy: actor,
          decidedAt: toIso(now)
        }
      }));
      return done(settleDuration(next, action));
    }
    case 'requestRepresentation': {
      if (!isChair) {
        return fail('forbidden');
      }
      const next = updatePassage(session, action.passageId, (passage) => ({
        ...passage,
        representationRequest: { by: actor, at: toIso(now) }
      }));
      return next ? done({ ok: true, session: next }) : fail('notFound');
    }
    case 'setAttendance': {
      if (!isChair) {
        return fail('forbidden');
      }
      const attendance = { ...session.attendance };
      normalizeEmails(action.emails || [action.email]).forEach((email) => {
        if (ATTENDANCE_STATES.includes(action.state)) {
          attendance[email] = action.state;
        } else {
          delete attendance[email];
        }
      });
      return done({ ok: true, session: { ...session, attendance } });
    }
    case 'setPassageAttendance': {
      if (!isChair) {
        return fail('forbidden');
      }
      const email = normalizeEmail(action.email);
      const next = updatePassage(session, action.passageId, (passage) => {
        const override = { ...passage.attendanceOverride };
        if (ATTENDANCE_STATES.includes(action.state) && action.state !== session.attendance[email]) {
          override[email] = action.state;
        } else {
          delete override[email];
        }
        return { ...passage, attendanceOverride: override };
      });
      return next ? done({ ok: true, session: next }) : fail('notFound');
    }
    case 'markReminderSent': {
      // Relu juste avant l'écriture en mode SharePoint : si une autre session a déjà envoyé ce
      // rappel, l'action échoue et le rappel n'est pas envoyé une seconde fois.
      const target = session.agenda.find((passage) => passage.id === action.passageId);
      if (target?.remindersSent.includes(action.reminder)) {
        return fail('alreadySent');
      }
      const next = updatePassage(session, action.passageId, (passage) => ({
        ...passage,
        remindersSent: Array.from(new Set([...passage.remindersSent, action.reminder]))
      }));
      return next ? { ok: true, session: next } : fail('notFound');
    }
    case 'markPlanningReminderSent':
      return session.planningReminderSentAt
        ? fail('alreadySent')
        : { ok: true, session: { ...session, planningReminderSentAt: toIso(now) } };
    case 'update': {
      if (!isChair) {
        return fail('forbidden');
      }
      const patch = action.patch || {};
      const next = normalizeSession({
        ...session,
        ...('startAt' in patch ? { startAt: patch.startAt } : {}),
        ...('durationMinutes' in patch ? { durationMinutes: patch.durationMinutes } : {}),
        ...('location' in patch ? { location: patch.location } : {})
      });
      if (!next.startAt) {
        return fail('invalid');
      }
      return done(settleDuration(next, action));
    }
    case 'publish':
      return isChair ? done({ ok: true, session: { ...session, status: SESSION_STATUS_PUBLISHED } }) : fail('forbidden');
    case 'cancel':
      return isChair ? done({ ok: true, session: { ...session, status: SESSION_STATUS_CANCELLED } }) : fail('forbidden');
    default:
      return fail('unknownAction');
  }
};

// ——— Planification ———

// `nth` : 1 à 4 pour « 1er … 4e <jour> du mois », -1 pour le dernier.
export const generateSessionDates = ({ weekday, nth, time = '14:00', from, to } = {}) => {
  const day = Number(weekday);
  const rank = Number(nth);
  const start = toTime(from);
  const end = toTime(to);
  if (!(day >= 0 && day <= 6) || ![1, 2, 3, 4, -1].includes(rank) || Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return [];
  }
  const [hours, minutes] = String(time).split(':').map((part) => Number.parseInt(part, 10));
  const results = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  for (let guard = 0; guard < 240 && cursor.getTime() <= end; guard += 1) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const matches = [];
    for (let date = 1; date <= 31; date += 1) {
      const candidate = new Date(year, month, date, Number.isFinite(hours) ? hours : 14, Number.isFinite(minutes) ? minutes : 0);
      if (candidate.getMonth() !== month) {
        break;
      }
      if (candidate.getDay() === day) {
        matches.push(candidate);
      }
    }
    const picked = rank === -1 ? matches[matches.length - 1] : matches[rank - 1];
    if (picked && picked.getTime() >= start && picked.getTime() <= end + DAY_MS - 1) {
      results.push(picked.toISOString());
    }
    cursor.setMonth(month + 1);
  }
  return results;
};

export const buildDraftSessions = ({ committeeId, dates, durationMinutes, location, existingSessions = [] }) => {
  const taken = new Set(normalizeSessions(existingSessions)
    .filter((session) => session.committeeId === committeeId && session.status !== SESSION_STATUS_CANCELLED)
    .map((session) => session.startAt));
  return (Array.isArray(dates) ? dates : [])
    .map(toIso)
    .filter((iso) => iso && !taken.has(iso))
    .map((startAt) => normalizeSession({
      committeeId,
      startAt,
      durationMinutes,
      location,
      status: SESSION_STATUS_DRAFT
    }));
};

// ——— Rappels (passe exécutée dans la session de la personne concernée, faute de serveur) ———

export const getDueOwnerReminder = (session, passage, now = new Date()) => {
  const normalized = normalizeSession(session);
  if (normalized.status !== SESSION_STATUS_PUBLISHED || isSessionPast(normalized, now)) {
    return '';
  }
  const days = getDaysUntilSession(normalized, now);
  const due = OWNER_REMINDER_DAYS
    .filter((threshold) => days <= threshold)
    .sort((a, b) => a - b)[0];
  if (due === undefined) {
    return '';
  }
  const key = `J-${due}`;
  return (passage?.remindersSent || []).includes(key) ? '' : key;
};

// Le président est relancé quand la dernière séance publiée de son comité approche : c'est le
// moment de planifier la suite. Le marqueur est posé sur cette dernière séance, si bien qu'une
// nouvelle séance publiée plus loin réarme la relance.
export const getPlanningReminderSession = (sessions, committeeId, now = new Date()) => {
  const published = normalizeSessions(sessions)
    .filter((session) => session.committeeId === committeeId && session.status === SESSION_STATUS_PUBLISHED);
  const last = published[published.length - 1];
  if (!last || last.planningReminderSentAt) {
    return null;
  }
  const days = getDaysUntilSession(last, now);
  return days >= 0 && days <= PLANNING_REMINDER_DAYS ? last : null;
};

// Projets qui déclenchent le comité sans passage à venir : la demande que le président doit
// pouvoir comparer au temps libre.
export const countUnbookedTriggeredProjects = (triggeredProjectIds, sessions, committeeId, now = new Date()) => {
  const booked = new Set(normalizeSessions(sessions)
    .filter((session) => session.committeeId === committeeId && session.status !== SESSION_STATUS_CANCELLED && !isSessionPast(session, now))
    .flatMap((session) => session.agenda.map((passage) => passage.projectId)));
  return (Array.isArray(triggeredProjectIds) ? triggeredProjectIds : []).filter((id) => !booked.has(id)).length;
};

export const getFreeMinutesAhead = (sessions, committeeId, now = new Date()) =>
  normalizeSessions(sessions)
    .filter((session) => session.committeeId === committeeId && session.status === SESSION_STATUS_PUBLISHED && !hasSessionStarted(session, now))
    .reduce((total, session) => total + Math.max(0, getRemainingMinutes(session)), 0);

// Retire tous les passages à venir d'un projet (corbeille, comité plus déclenché) ; renvoie les
// séances modifiées seulement.
export const removeUpcomingProjectPassages = (sessions, projectId, { committeeId = '', now = new Date() } = {}) =>
  normalizeSessions(sessions)
    .filter((session) => (!committeeId || session.committeeId === committeeId)
      && !isSessionPast(session, now)
      && session.agenda.some((passage) => passage.projectId === projectId))
    .map((session) => ({
      session,
      passageIds: session.agenda.filter((passage) => passage.projectId === projectId).map((passage) => passage.id)
    }));

// Un avis de comité rendu (ou repris) pendant ou après une séance où le projet est passé est
// rattaché à cette séance, et l'avis tel qu'il est alors est figé pour cette séance : avec
// plusieurs passages, le comité retrouve ce qu'il avait demandé la fois précédente.
// `resolveSessionId(committeeId)` renvoie la séance du dernier passage commencé, ou ''.
export const stampCommitteeOpinionSessions = (nextComments, previousComments, resolveSessionId) => {
  const committees = nextComments?.committees;
  if (!committees || typeof committees !== 'object' || Array.isArray(committees) || typeof resolveSessionId !== 'function') {
    return nextComments;
  }
  const previousCommittees = previousComments?.committees && typeof previousComments.committees === 'object'
    ? previousComments.committees
    : {};
  let changed = false;
  const stamped = Object.entries(committees).reduce((acc, [committeeId, entry]) => {
    const previous = previousCommittees[committeeId];
    const reviewedAt = typeof entry?.reviewedAt === 'string' ? entry.reviewedAt : '';
    const sessionId = reviewedAt && reviewedAt !== previous?.reviewedAt ? resolveSessionId(committeeId) : '';
    if (!sessionId) {
      acc[committeeId] = entry;
      return acc;
    }
    changed = true;
    const outcomes = entry.sessionOutcomes && typeof entry.sessionOutcomes === 'object' && !Array.isArray(entry.sessionOutcomes)
      ? entry.sessionOutcomes
      : {};
    acc[committeeId] = {
      ...entry,
      sessionId,
      sessionOutcomes: {
        ...outcomes,
        [sessionId]: {
          status: typeof entry.status === 'string' ? entry.status : '',
          comment: typeof entry.comment === 'string' ? entry.comment : '',
          renderedAt: reviewedAt
        }
      }
    };
    return acc;
  }, {});
  return changed ? { ...nextComments, committees: stamped } : nextComments;
};
