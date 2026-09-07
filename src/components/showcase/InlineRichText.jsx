import React, { useCallback, useEffect, useRef } from '../../react.js';
import { sanitizeRichText } from '../../utils/richText.js';

/**
 * Champ éditable *dans* la vitrine : l'utilisateur tape directement sur le texte tel qu'il
 * sera publié, avec la typographie et la couleur définitives. Volontairement réduit au
 * strict nécessaire — la mise en forme riche reste dans l'inspecteur, via RichTextEditor.
 */
export const InlineRichText = ({
  as: Tag = 'span',
  value,
  onChange,
  placeholder = '',
  className = '',
  ariaLabel,
  multiline = false
}) => {
  const nodeRef = useRef(null);

  // Même garde que RichTextEditor : réécrire innerHTML pendant que le champ a le focus
  // replacerait le curseur en fin de texte à chaque caractère saisi.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement === node) {
      return;
    }

    const next = typeof value === 'string' ? value : '';
    if (node.innerHTML !== next) {
      node.innerHTML = next;
    }
  }, [value]);

  // Volontairement branché sur `input` seulement, jamais sur `blur` : remonter la valeur
  // au moment où le champ perd le focus déclenche un rendu entre le mousedown et le mouseup
  // du clic suivant. Si la mise en page bouge, le bouton visé change de place et le clic
  // n'aboutit jamais — le premier clic après une saisie était perdu.
  const handleInput = useCallback(() => {
    if (!nodeRef.current || typeof onChange !== 'function') {
      return;
    }
    onChange(sanitizeRichText(nodeRef.current.innerHTML));
  }, [onChange]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' || (!multiline && event.key === 'Enter')) {
      event.preventDefault();
      nodeRef.current?.blur();
      return;
    }

    // Le champ vit à l'intérieur du canvas, qui écoute les raccourcis globaux : sans cette
    // barrière, Ctrl+Z rejouerait l'historique de la vitrine au lieu d'annuler la frappe.
    event.stopPropagation();
  }, [multiline]);

  // Colle en texte brut : sans cela, un copier-coller depuis Word injecte son propre balisage,
  // que le sanitizer supprimerait ensuite en désynchronisant l'affichage de la valeur.
  const handlePaste = useCallback((event) => {
    const text = event.clipboardData?.getData('text/plain');
    if (typeof text !== 'string') {
      return;
    }
    event.preventDefault();
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      document.execCommand('insertText', false, text);
    }
  }, []);

  return (
    <Tag
      ref={nodeRef}
      className={`sge-inline ${className}`.trim()}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-multiline={multiline ? 'true' : 'false'}
      data-sge-placeholder={placeholder}
      spellCheck
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDragStart={(event) => event.preventDefault()}
    />
  );
};

export default InlineRichText;
