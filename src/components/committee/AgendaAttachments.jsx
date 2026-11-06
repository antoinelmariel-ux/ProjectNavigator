import React, { useRef, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { isSharePointMode } from '../../config/sharepointConfig.js';
import { createAttachmentFromFile, deleteDocument, formatFileSize } from '../../utils/documentStore.js';
import {
  AGENDA_ATTACHMENT_LINK,
  MAX_AGENDA_ATTACHMENTS,
  createAgendaAttachmentId,
  getStoredAgendaFilePaths,
  normalizeAgendaLinkUrl
} from '../../utils/agendaAttachments.js';
import { NEW_TAB_LINK_ATTRIBUTES } from '../../utils/newTabLinks.js';

const isInlineFile = (attachment) => attachment.type !== AGENDA_ATTACHMENT_LINK && /^data:/i.test(attachment.url);

// Un fichier gardé en data: URL (mode local) ne s'ouvre pas dans un nouvel onglet — les
// navigateurs refusent d'y naviguer — : il se télécharge.
const AttachmentLink = ({ attachment }) => (
  <a
    href={attachment.url}
    className="font-semibold text-blue-700 underline break-all"
    {...(isInlineFile(attachment) ? { download: attachment.name } : NEW_TAB_LINK_ATTRIBUTES)}
  >
    {attachment.name}
  </a>
);

export const AgendaAttachmentList = ({ attachments = [], idPrefix, renderAction }) => {
  const { t } = useTranslation();
  if (attachments.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-1" aria-labelledby={idPrefix ? `${idPrefix}-title` : undefined} data-testid="agenda-attachment-list">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex flex-wrap items-center gap-2 text-sm" data-testid="agenda-attachment">
          <span aria-hidden="true">{attachment.type === AGENDA_ATTACHMENT_LINK ? '🔗' : '📎'}</span>
          <AttachmentLink attachment={attachment} />
          {attachment.type === AGENDA_ATTACHMENT_LINK ? (
            <span className="text-xs text-gray-500">{t('committeeSessions.attachments.linkBadge')}</span>
          ) : attachment.size > 0 && (
            <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
          )}
          {typeof renderAction === 'function' && renderAction(attachment)}
        </li>
      ))}
    </ul>
  );
};

// Documents et liens d'un point de l'ordre du jour (sujet ou projet). Le président et le co-président (ou un
// administrateur) les gèrent ; les membres et les intervenants ne font que les ouvrir.
export const AgendaAttachments = ({ idPrefix, attachments = [], canEdit = false, audience = 'topic', entityId, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [linkDraft, setLinkDraft] = useState({ url: '', name: '' });
  const [busyName, setBusyName] = useState('');
  const [messages, setMessages] = useState([]);

  if (!canEdit && attachments.length === 0) {
    return null;
  }

  const describeError = (result) => (result?.error === 'tooManyAttachments'
    ? t('committeeSessions.errors.tooManyAttachments', { max: MAX_AGENDA_ATTACHMENTS })
    : t(`committeeSessions.errors.${result?.error || 'generic'}`, { minutes: 0 }));

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      return;
    }
    const next = [];
    for (const file of files) {
      setBusyName(file.name);
      let attachment;
      try {
        attachment = await createAttachmentFromFile(file, {
          entityType: 'committee-agenda',
          entityId,
          id: createAgendaAttachmentId()
        });
      } catch (error) {
        next.push({ tone: 'error', text: t('committeeSessions.attachments.uploadFailed', { name: file.name, reason: error?.message || '' }) });
        continue;
      }
      const result = await onAdd(attachment);
      if (result?.ok) {
        next.push({ tone: 'success', text: t('committeeSessions.attachments.added', { name: attachment.name }) });
      } else {
        next.push({ tone: 'error', text: t('committeeSessions.attachments.uploadFailed', { name: file.name, reason: describeError(result) }) });
        getStoredAgendaFilePaths([attachment]).forEach((path) => {
          deleteDocument(path).catch((error) => console.warn('[Comités] Nettoyage du fichier impossible :', error));
        });
      }
    }
    setBusyName('');
    setMessages(next);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async (event) => {
    event.preventDefault();
    const url = normalizeAgendaLinkUrl(linkDraft.url);
    if (!url) {
      setMessages([{ tone: 'error', text: t('committeeSessions.attachments.invalidLink') }]);
      return;
    }
    const result = await onAdd({ id: createAgendaAttachmentId(), type: AGENDA_ATTACHMENT_LINK, url, name: linkDraft.name });
    if (result?.ok) {
      setLinkDraft({ url: '', name: '' });
      setMessages([{ tone: 'success', text: t('committeeSessions.attachments.added', { name: result.attachment?.name || url }) }]);
    } else {
      setMessages([{ tone: 'error', text: describeError(result) }]);
    }
  };

  const handleRemove = async (attachment) => {
    if (typeof window !== 'undefined'
      && !window.confirm(t('committeeSessions.attachments.removeConfirm', { name: attachment.name }))) {
      return;
    }
    const result = await onRemove(attachment);
    if (result?.ok) {
      setMessages([{ tone: 'success', text: t('committeeSessions.attachments.removed', { name: attachment.name }) }]);
    } else {
      setMessages([{ tone: 'error', text: describeError(result) }]);
    }
  };

  const isFull = attachments.length >= MAX_AGENDA_ATTACHMENTS;

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2" aria-labelledby={`${idPrefix}-title`} data-testid="agenda-attachments">
      <div>
        <h4 id={`${idPrefix}-title`} className="text-sm font-semibold text-gray-800">{t('committeeSessions.attachments.title')}</h4>
        {canEdit && <p className="text-xs text-gray-500">{t(audience === 'project' ? 'committeeSessions.attachments.audienceProject' : 'committeeSessions.attachments.audience')}</p>}
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-gray-500">{t('committeeSessions.attachments.empty')}</p>
      ) : (
        <AgendaAttachmentList
          attachments={attachments}
          idPrefix={idPrefix}
          renderAction={canEdit ? (attachment) => (
            <button
              type="button"
              onClick={() => handleRemove(attachment)}
              aria-label={t('committeeSessions.attachments.remove', { name: attachment.name })}
              className="rounded border border-red-200 bg-white px-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              ×
            </button>
          ) : undefined}
        />
      )}
      {canEdit && (
        <div className="space-y-2 border-t border-gray-200 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`${idPrefix}-files`}
              className={`cursor-pointer rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 ${isFull || busyName ? 'pointer-events-none opacity-40' : ''}`}
            >
              {t('committeeSessions.attachments.addFiles')}
            </label>
            <input
              ref={fileInputRef}
              id={`${idPrefix}-files`}
              type="file"
              multiple
              disabled={isFull || Boolean(busyName)}
              className="sr-only"
              onChange={(event) => handleFiles(event.target.files)}
            />
            {busyName && (
              <span className="text-xs text-gray-600" role="status">{t('committeeSessions.attachments.uploading', { name: busyName })}</span>
            )}
          </div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={handleAddLink}>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${idPrefix}-link-url`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.attachments.linkUrlLabel')}</label>
              <input
                id={`${idPrefix}-link-url`}
                type="text"
                inputMode="url"
                value={linkDraft.url}
                placeholder={t('committeeSessions.attachments.linkPlaceholder')}
                onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${idPrefix}-link-name`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.attachments.linkNameLabel')}</label>
              <input
                id={`${idPrefix}-link-name`}
                type="text"
                value={linkDraft.name}
                onChange={(event) => setLinkDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isFull || !linkDraft.url.trim()}
              className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              {t('committeeSessions.attachments.addLink')}
            </button>
          </form>
          {isSharePointMode() && <p className="text-xs text-gray-500">{t('committeeSessions.attachments.sharePointAccess')}</p>}
        </div>
      )}
      {messages.length > 0 && (
        <ul className="space-y-0.5">
          {messages.map((message, index) => (
            <li
              key={index}
              role={message.tone === 'error' ? 'alert' : 'status'}
              className={`text-xs ${message.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
            >
              {message.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AgendaAttachments;
