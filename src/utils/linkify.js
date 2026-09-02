import React from '../react.js';
import { sanitizeRichText } from './richText.js';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const TRAILING_PUNCTUATION_REGEX = /[)\]}.,;!?]+$/;

const renderWithDomSanitizer = (text) => {
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const sanitized = sanitizeRichText(text);

  if (typeof sanitized !== 'string' || sanitized.length === 0) {
    return null;
  }

  return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

const renderWithoutDomParser = (text) => {
  const matches = [];

  let markdownMatch;
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((markdownMatch = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    matches.push({
      type: 'markdown',
      fullMatch: markdownMatch[0],
      offset: markdownMatch.index ?? 0,
      label: markdownMatch[1],
      url: markdownMatch[2]
    });
  }

  let urlMatch;
  URL_REGEX.lastIndex = 0;
  while ((urlMatch = URL_REGEX.exec(text)) !== null) {
    const offset = urlMatch.index ?? 0;
    const isInsideMarkdownLink = matches.some((existingMatch) =>
      existingMatch.type === 'markdown'
      && offset >= existingMatch.offset
      && offset < existingMatch.offset + existingMatch.fullMatch.length
    );

    if (isInsideMarkdownLink) {
      continue;
    }

    matches.push({
      type: 'url',
      fullMatch: urlMatch[0],
      offset
    });
  }

  matches.sort((a, b) => a.offset - b.offset);

  if (matches.length === 0) {
    return text;
  }

  const elements = [];
  let lastIndex = 0;

  matches.forEach((match, matchIdx) => {
    const fullMatch = match.fullMatch;
    const offset = match.offset;

    if (offset > lastIndex) {
      elements.push(text.slice(lastIndex, offset));
    }

    let url = match.type === 'markdown' ? match.url : fullMatch;
    const trailingMatch = match.type === 'markdown' ? null : url.match(TRAILING_PUNCTUATION_REGEX);
    let trailing = '';

    if (trailingMatch) {
      url = url.slice(0, -trailingMatch[0].length);
      trailing = trailingMatch[0];
    }

    elements.push(
      <a
        key={`link-${offset}-${matchIdx}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        {match.type === 'markdown' ? match.label : url}
      </a>
    );

    if (trailing) {
      elements.push(trailing);
    }

    lastIndex = offset + fullMatch.length;
  });

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
};

export const renderTextWithLinks = (text) => {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  const rendered = renderWithDomSanitizer(text);

  if (rendered !== null) {
    return rendered;
  }

  return renderWithoutDomParser(text);
};
