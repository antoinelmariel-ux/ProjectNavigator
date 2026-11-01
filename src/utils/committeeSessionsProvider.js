import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { ConflictError } from './errors.js';
import { rowToRecord } from './listSchemas.js';
import { normalizeSession } from './committeeSessions.js';

const MAX_ATTEMPTS = 4;

const toSession = (record) => normalizeSession({
  id: record.SessionId,
  committeeId: record.CommitteeId,
  startAt: record.StartAt,
  durationMinutes: record.DurationMinutes,
  location: record.Location,
  status: record.Status,
  agenda: Array.isArray(record.AgendaJson) ? record.AgendaJson : [],
  attendance: record.AttendanceJson && typeof record.AttendanceJson === 'object' ? record.AttendanceJson : {},
  planningReminderSentAt: record.PlanningReminderSentAt,
  updatedAt: record.UpdatedAt,
  updatedBy: record.UpdatedByEmail
});

const toRecord = (session, { committeeName = '', userEmail = '' } = {}) => ({
  Title: `${committeeName || session.committeeId} — ${session.startAt}`,
  SessionId: session.id,
  CommitteeId: session.committeeId,
  StartAt: session.startAt,
  DurationMinutes: session.durationMinutes,
  Location: session.location,
  Status: session.status,
  AgendaJson: session.agenda,
  AttendanceJson: session.attendance,
  PlanningReminderSentAt: session.planningReminderSentAt || null,
  UpdatedByEmail: userEmail || session.updatedBy || '',
  UpdatedAt: new Date().toISOString()
});

// Écriture d'une séance : on relit la ligne, on rejoue l'action sur ce qu'elle contient
// vraiment, puis on écrit sous IF-MATCH. Si quelqu'un a écrit entre-temps (412), on recommence :
// l'action est rejugée sur le nouvel état, si bien qu'une inscription n'est jamais acceptée sur
// un temps restant périmé. `mutate` est pur (applySessionAction) et peut donc être rejoué.
export class SharePointCommitteeSessionsProvider {
  constructor() {
    this.repository = getRepository('committeeSessions');
  }

  async listAllSessions() {
    const records = await this.repository.getAll();
    return records.map(toSession);
  }

  async createSession(session, { userEmail, committeeName } = {}) {
    const created = await this.repository.create({
      ...toRecord(session, { userEmail, committeeName }),
      CreatedByEmail: userEmail || ''
    });
    return toSession(created);
  }

  async mutateSession(sessionId, mutate, { userEmail, committeeName } = {}) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const found = await this.repository.findRawByKey(sessionId);
      if (!found) {
        return { ok: false, error: 'notFound' };
      }
      const current = toSession(rowToRecord(this.repository.schema, found.row));
      const result = mutate(current);
      if (!result?.ok) {
        return { ...result, session: current };
      }
      try {
        const currentVersion = Number(found.row.RowVersion) || 1;
        await this.repository.update(found.row.Id, {
          ...toRecord(result.session, { userEmail, committeeName }),
          RowVersion: currentVersion + 1
        }, found.etag);
        return result;
      } catch (error) {
        if (!(error instanceof ConflictError) || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
    return { ok: false, error: 'conflict' };
  }

  async removeSession(sessionId) {
    const found = await this.repository.findRawByKey(sessionId);
    if (found) {
      await this.repository.remove(found.row.Id, found.etag);
    }
  }
}

// En mode local, les séances vivent dans la tranche `committeeSessions` de
// complianceNavigatorState (App.jsx) : ce provider n'y est jamais consulté.
export const committeeSessionsProvider = isSharePointMode() ? new SharePointCommitteeSessionsProvider() : null;
