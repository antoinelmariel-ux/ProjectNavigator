import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { ConflictError } from './errors.js';
import { getInvitationFingerprint } from './committeeInvitations.js';

const MAX_ATTEMPTS = 3;

const splitAttendees = (value) => String(value || '')
  .split(/[;,]/)
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const fromRecord = (record) => ({
  id: record.InvitationId,
  sessionId: record.SessionId || '',
  passageId: record.PassageId || '',
  projectId: record.ProjectId || '',
  committeeId: record.CommitteeId || '',
  status: record.Status || '',
  subject: record.Subject || '',
  bodyHtml: record.BodyHtml || '',
  startAt: record.StartAt || '',
  endAt: record.EndAt || '',
  location: record.Location || '',
  attendees: splitAttendees(record.Attendees),
  revision: Number(record.Revision) || 0,
  processedRevision: Number(record.ProcessedRevision) || 0,
  outlookEventId: record.OutlookEventId || '',
  syncState: record.SyncState || '',
  errorMessage: record.ErrorMessage || '',
  processedAt: record.ProcessedAt || ''
});

// Colonnes écrites par l'application uniquement : jamais celles du flux.
const toAppFields = (invitation, { revision, userEmail }) => ({
  Title: invitation.subject,
  InvitationId: invitation.id,
  SessionId: invitation.sessionId,
  PassageId: invitation.passageId,
  ProjectId: invitation.projectId,
  CommitteeId: invitation.committeeId,
  Status: invitation.status,
  Subject: invitation.subject,
  BodyHtml: invitation.bodyHtml,
  StartAt: invitation.startAt,
  EndAt: invitation.endAt,
  Location: invitation.location,
  // Séparateur « ; » : c'est ce qu'attend le champ « Participants obligatoires » d'Outlook.
  Attendees: invitation.attendees.join(';'),
  Revision: revision,
  UpdatedByEmail: userEmail || '',
  UpdatedAt: new Date().toISOString()
});

export class SharePointCommitteeInvitationsProvider {
  constructor() {
    this.repository = getRepository('committeeInvitations');
  }

  async listAllInvitations() {
    const records = await this.repository.getAll();
    return records.map(fromRecord);
  }

  // Écrit l'invitation si elle a changé, en incrémentant `Revision` (c'est ce qui redéclenche le
  // flux). Une invitation inchangée n'est pas réécrite ; une annulation d'invitation jamais créée
  // n'écrit rien. Si le flux écrit sa réponse entre la lecture et l'écriture (412), on relit.
  async syncInvitation(invitation, { userEmail } = {}) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const found = await this.repository.findRawByKey(invitation.id);
      const existing = found ? fromRecord(found.row) : null;
      if (!existing && invitation.status !== 'active') {
        return { written: false, record: null };
      }
      if (existing && getInvitationFingerprint(existing) === getInvitationFingerprint(invitation)) {
        return { written: false, record: existing };
      }
      const revision = (existing?.revision || 0) + 1;
      try {
        if (!found) {
          await this.repository.create({
            ...toAppFields(invitation, { revision, userEmail }),
            ProcessedRevision: 0,
            SyncState: 'pending'
          });
        } else {
          await this.repository.update(found.row.Id, toAppFields(invitation, { revision, userEmail }), found.etag);
        }
        return {
          written: true,
          record: { ...(existing || {}), ...invitation, revision, processedRevision: existing?.processedRevision || 0, syncState: 'pending' }
        };
      } catch (error) {
        if (!(error instanceof ConflictError) || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
    return { written: false, record: null };
  }
}

// Hors mode SharePoint il n'y a pas de flux pour envoyer quoi que ce soit : rien n'est écrit.
export const committeeInvitationsProvider = isSharePointMode() ? new SharePointCommitteeInvitationsProvider() : null;
