import React from '../react.js';

const URL_REGEX = /(https?:\/\/[^\s<]+)/gi;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
const TRAILING_PUNCTUATION_REGEX = /[)\]}.,;!?]+$/;
const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a']);

// balises qu'un navigateur peut insérer pour marquer un début de ligne ou de
// bloc (le cas réel et fréquent est <div>, ajoutée par Chrome/Firefox à
// l'appui sur Entrée) ; non autorisées, elles seraient sinon retirées en
// silence par la règle ci-dessous, recollant deux lignes que l'utilisateur
// avait séparées
const BLOCK_LIKE_UNKNOWN_TAGS = new Set([
  'div', 'section', 'article', 'header', 'footer',
  'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'figure', 'figcaption'
]);

const ensureAllowedAnchor = (node) => {
  if (!node || node.nodeName?.toLowerCase() !== 'a') {
    return;
  }

  const href = node.getAttribute('href') || '';
  const isHttpLink = /^https?:\/\//i.test(href);

  if (!isHttpLink) {
    node.removeAttribute('href');
  } else {
    node.setAttribute('href', href);
  }

  node.setAttribute('target', '_blank');
  node.setAttribute('rel', 'noopener noreferrer');

  Array.from(node.attributes || []).forEach(attribute => {
    const name = attribute?.name?.toLowerCase();
    if (!['href', 'target', 'rel'].includes(name)) {
      node.removeAttribute(attribute.name);
    }
  });
};

const linkifyTextNode = (node, documentContext) => {
  if (!node || node.nodeType !== 3) {
    return;
  }

  const textContent = node.textContent || '';
  const matches = [];
  let markdownMatch;
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((markdownMatch = MARKDOWN_LINK_REGEX.exec(textContent)) !== null) {
    matches.push({
      type: 'markdown',
      fullMatch: markdownMatch[0],
      index: markdownMatch.index ?? 0,
      label: markdownMatch[1],
      url: markdownMatch[2]
    });
  }

  let urlMatch;
  URL_REGEX.lastIndex = 0;
  while ((urlMatch = URL_REGEX.exec(textContent)) !== null) {
    const offset = urlMatch.index ?? 0;
    const isInsideMarkdownLink = matches.some((existingMatch) =>
      existingMatch.type === 'markdown'
      && offset >= existingMatch.index
      && offset < existingMatch.index + existingMatch.fullMatch.length
    );

    if (isInsideMarkdownLink) {
      continue;
    }

    matches.push({
      type: 'url',
      fullMatch: urlMatch[0],
      index: offset
    });
  }

  matches.sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    return;
  }

  const fragment = documentContext.createDocumentFragment();
  let lastIndex = 0;

  matches.forEach(match => {
    const fullMatch = match.fullMatch;
    const offset = match.index;

    if (offset > lastIndex) {
      fragment.appendChild(documentContext.createTextNode(textContent.slice(lastIndex, offset)));
    }

    let url = match.type === 'markdown' ? match.url : fullMatch;
    const trailingMatch = match.type === 'markdown' ? null : url.match(TRAILING_PUNCTUATION_REGEX);
    const trailing = trailingMatch ? trailingMatch[0] : '';

    if (trailingMatch) {
      url = url.slice(0, -trailingMatch[0].length);
    }

    const anchor = documentContext.createElement('a');
    anchor.textContent = match.type === 'markdown' ? match.label : url;
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    fragment.appendChild(anchor);

    if (trailing) {
      fragment.appendChild(documentContext.createTextNode(trailing));
    }

    lastIndex = offset + fullMatch.length;
  });

  if (lastIndex < textContent.length) {
    fragment.appendChild(documentContext.createTextNode(textContent.slice(lastIndex)));
  }

  node.replaceWith(fragment);
};

const sanitizeNode = (node, documentContext) => {
  if (!node) {
    return;
  }

  const nodeType = node.nodeType;

  if (nodeType === 3) {
    linkifyTextNode(node, documentContext);
    return;
  }

  if (nodeType !== 1) {
    node.remove();
    return;
  }

  const tagName = node.nodeName?.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }

    // Une balise non autorisée qui marquait un début de bloc (ex. <div>, insérée
    // par certains navigateurs à l'appui sur Entrée) ne doit pas recoller son
    // contenu à ce qui précède : on la remplace par un simple <br>, sauf si elle
    // ouvre le tout début du contenu (rien à séparer dans ce cas).
    if (BLOCK_LIKE_UNKNOWN_TAGS.has(tagName) && node.previousSibling) {
      parent.insertBefore(documentContext.createElement('br'), node);
    }

    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
    return;
  }

  if (tagName === 'a') {
    ensureAllowedAnchor(node);
  } else {
    Array.from(node.attributes || []).forEach(attribute => {
      node.removeAttribute(attribute.name);
    });
  }

  Array.from(node.childNodes || []).forEach(child => sanitizeNode(child, documentContext));
};

export const sanitizeRichText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return trimmed;
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString('<div></div>', 'text/html');
  const container = parsedDocument.createElement('div');
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  const normalizedInput = hasHtmlTags
    ? trimmed
    : trimmed.replace(/\r\n/g, '\n').split('\n').join('<br />');

  container.innerHTML = normalizedInput;

  Array.from(container.childNodes || []).forEach(child => sanitizeNode(child, parsedDocument));

  return container.innerHTML;
};

export const renderRichText = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const sanitizedHtml = sanitizeRichText(value);

  if (!sanitizedHtml) {
    return '';
  }

  return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
