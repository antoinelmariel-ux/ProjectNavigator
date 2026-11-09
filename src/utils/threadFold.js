// Un fil long ne montre que sa fin : les derniers messages, plus tous ceux arrivés depuis la
// dernière visite (même s'ils sont plus nombreux), le reste tenant en une ligne « Afficher N
// messages plus anciens ». L'avis d'un comité (message `comment-…`) reste toujours en tête : c'est
// lui qu'on vient lire. Un lien vers un message précis déplie le fil en entier (`isExpanded`).
export const THREAD_VISIBLE_TAIL = 3;

const isPinnedMessage = (message) => String(message?.id || '').startsWith('comment-');

export const foldThreadMessages = (messages, { isExpanded = false, isNewMessage = () => false } = {}) => {
  const list = Array.isArray(messages) ? messages : [];
  const pinned = list.filter(isPinnedMessage);
  const rest = list.filter((message) => !isPinnedMessage(message));
  if (isExpanded || rest.length <= THREAD_VISIBLE_TAIL) {
    return { pinned, visible: rest, hiddenCount: 0 };
  }
  let start = rest.length - THREAD_VISIBLE_TAIL;
  const firstNewIndex = rest.findIndex((message) => isNewMessage(message));
  if (firstNewIndex !== -1 && firstNewIndex < start) {
    start = firstNewIndex;
  }
  return { pinned, visible: rest.slice(start), hiddenCount: start };
};
