import { useCallback, useEffect, useRef } from '../react.js';
import { committeeSessionsProvider } from '../utils/committeeSessionsProvider.js';
import {
  applySessionAction,
  getCommitteeDefaultPassageMinutes,
  isCommitteeChair,
  normalizeSession,
  normalizeSessions
} from '../utils/committeeSessions.js';

// Écritures du calendrier des comités. Pas de file de rejeu (retryQueue) ici, à dessein : une
// inscription doit dire tout de suite si elle est acceptée — une séance pleine entre-temps n'est
// pas une erreur réseau à rejouer plus tard, c'est une réponse à donner au chef de projet. En
// mode SharePoint chaque action est donc rejouée sur la ligne relue (mutateSession) et l'état
// local reprend ce que le serveur a vraiment enregistré, y compris en cas de refus.
export const useCommitteeSessionActions = ({
  sessions,
  setSessions,
  committeesById,
  currentUserEmail,
  isAdmin,
  onEvent,
  onSessionChanged
}) => {
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const replaceSessions = useCallback((nextSessions, removedIds = []) => {
    const replacements = new Map(nextSessions.map((session) => [session.id, normalizeSession(session)]));
    const apply = (previous) => normalizeSessions([
      ...previous.filter((session) => !replacements.has(session.id) && !removedIds.includes(session.id)),
      ...replacements.values()
    ]);
    sessionsRef.current = apply(sessionsRef.current);
    setSessions(apply);
  }, [setSessions]);

  const buildContext = useCallback((committee) => ({
    actorEmail: currentUserEmail,
    isChair: Boolean(isAdmin) || isCommitteeChair(committee, currentUserEmail),
    defaultPassageMinutes: getCommitteeDefaultPassageMinutes(committee),
    now: new Date()
  }), [currentUserEmail, isAdmin]);

  const runAction = useCallback(async (sessionId, action) => {
    const current = sessionsRef.current.find((session) => session.id === sessionId);
    if (!current) {
      return { ok: false, error: 'notFound' };
    }
    const committee = committeesById[current.committeeId] || null;
    const context = buildContext(committee);
    const mutate = (session) => applySessionAction(session, action, context);

    let result;
    if (committeeSessionsProvider) {
      try {
        result = await committeeSessionsProvider.mutateSession(sessionId, mutate, {
          userEmail: currentUserEmail,
          committeeName: committee?.name || ''
        });
      } catch (error) {
        console.warn('[Comités] Écriture de séance impossible :', error);
        return { ok: false, error: 'network' };
      }
    } else {
      result = mutate(current);
    }

    if (result?.session) {
      replaceSessions([result.session]);
    }
    if (result?.ok && typeof onEvent === 'function') {
      onEvent({ action, before: current, after: result.session, result, committee });
    }
    if (result?.ok && typeof onSessionChanged === 'function') {
      onSessionChanged({ before: current, after: result.session, committee });
    }
    return result || { ok: false, error: 'unknown' };
  }, [buildContext, committeesById, currentUserEmail, onEvent, onSessionChanged, replaceSessions]);

  const createSessions = useCallback(async (drafts) => {
    const list = (Array.isArray(drafts) ? drafts : []).map(normalizeSession);
    if (list.length === 0) {
      return { ok: true, sessions: [] };
    }
    if (!committeeSessionsProvider) {
      replaceSessions(list);
      return { ok: true, sessions: list };
    }
    const created = [];
    try {
      for (const session of list) {
        const committee = committeesById[session.committeeId];
        created.push(await committeeSessionsProvider.createSession(session, {
          userEmail: currentUserEmail,
          committeeName: committee?.name || ''
        }));
      }
    } catch (error) {
      console.warn('[Comités] Création de séance impossible :', error);
      replaceSessions(created);
      return { ok: false, error: 'network', sessions: created };
    }
    replaceSessions(created);
    return { ok: true, sessions: created };
  }, [committeesById, currentUserEmail, replaceSessions]);

  // Seule une séance en brouillon se supprime : une séance publiée s'annule, pour que ses
  // inscrits soient prévenus.
  const deleteDraftSession = useCallback(async (sessionId) => {
    const current = sessionsRef.current.find((session) => session.id === sessionId);
    if (!current || current.status !== 'draft') {
      return { ok: false, error: 'forbidden' };
    }
    if (committeeSessionsProvider) {
      try {
        await committeeSessionsProvider.removeSession(sessionId);
      } catch (error) {
        console.warn('[Comités] Suppression de séance impossible :', error);
        return { ok: false, error: 'network' };
      }
    }
    replaceSessions([], [sessionId]);
    return { ok: true };
  }, [replaceSessions]);

  // Changer de séance = prendre la nouvelle place d'abord, libérer l'ancienne ensuite : si la
  // nouvelle séance est pleine, le passage d'origine est conservé.
  const movePassage = useCallback(async (fromSessionId, passageId, toSessionId) => {
    const source = sessionsRef.current.find((session) => session.id === fromSessionId);
    const passage = source?.agenda.find((entry) => entry.id === passageId);
    if (!passage) {
      return { ok: false, error: 'notFound' };
    }
    const booked = await runAction(toSessionId, {
      type: 'book',
      projectId: passage.projectId,
      minutes: passage.minutes,
      guests: passage.guests,
      allowOverrun: true,
      isMove: true
    });
    if (!booked.ok) {
      return booked;
    }
    const released = await runAction(fromSessionId, { type: 'unbook', passageId, isMove: true });
    return released.ok ? booked : released;
  }, [runAction]);

  return { runAction, createSessions, deleteDraftSession, movePassage, sessionsRef };
};
