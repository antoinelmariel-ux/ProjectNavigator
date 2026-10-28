import React, { useCallback, useEffect, useRef, useState } from '../../react.js';
import { DocumentDropZone } from './DocumentDropZone.jsx';
import {
  CAPTION_MODE_NONE,
  MEDIA_KIND_AUDIO,
  MEDIA_KIND_IMAGE,
  MEDIA_KIND_STREAM,
  MEDIA_KIND_VIDEO,
  MAX_MEDIA_WIDTH,
  MIN_MEDIA_WIDTH,
  clampCarouselIndex,
  clampMediaWidth,
  computeMediaWidthFromPointer,
  normalizeCaptionMode,
  normalizeCaptionPosition,
  normalizeMediaList,
  resolveMediaCaption,
  resolveStreamEmbedUrl
} from '../../utils/showcaseMediaGallery.js';

const KEYBOARD_WIDTH_STEP = 5;

const MediaGlyph = ({ kind }) => {
  if (kind === MEDIA_KIND_AUDIO) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="3" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="17" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (kind === MEDIA_KIND_VIDEO || kind === MEDIA_KIND_STREAM) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4 18 5-5 3.5 3.5L15 14l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const MediaItem = ({ item, title, t }) => {
  const label = item.name || title;
  if (item.kind === MEDIA_KIND_IMAGE) {
    return (
      <img
        className="sg-media__image"
        src={item.url}
        alt={label}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
  }
  if (item.kind === MEDIA_KIND_VIDEO) {
    return (
      <video className="sg-media__video" src={item.url} controls preload="metadata" playsInline aria-label={label} />
    );
  }
  if (item.kind === MEDIA_KIND_AUDIO) {
    return (
      <div className="sg-media__audio">
        <span className="sg-media__audio-glyph"><MediaGlyph kind={MEDIA_KIND_AUDIO} /></span>
        <span className="sg-media__audio-name">{label}</span>
        <audio src={item.url} controls preload="metadata" aria-label={label} />
      </div>
    );
  }
  const embedUrl = resolveStreamEmbedUrl(item.url);
  if (embedUrl) {
    return (
      <iframe
        className="sg-media__frame"
        src={embedUrl}
        title={label}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  return (
    <div className="sg-media__stream-link">
      <span className="sg-media__audio-glyph"><MediaGlyph kind={MEDIA_KIND_STREAM} /></span>
      <span>{t('projectShowcase.mediaGallery.streamNotEmbeddable')}</span>
      <a href={item.url} target="_blank" rel="noopener noreferrer" data-interception="off">
        {t('projectShowcase.mediaGallery.openInStream')}
      </a>
    </div>
  );
};

/**
 * Bloc « Galerie média » : un média seul, ou un carrousel dès qu'il y en a deux. On ne
 * change de média qu'au clic (flèches, points) : rien ne défile tout seul, et seul le média
 * affiché est monté, ce qui met une vidéo en pause dès qu'on la quitte.
 */
export const MediaGallery = ({
  section,
  family,
  editable = false,
  titleNode,
  renderCaption,
  onWidthChange,
  dropZone,
  error,
  t
}) => {
  const media = normalizeMediaList(section?.media);
  const count = media.length;
  const captionMode = normalizeCaptionMode(section?.captionMode);
  const storedWidth = clampMediaWidth(section?.mediaWidth);
  const [index, setIndex] = useState(0);
  const [dragWidth, setDragWidth] = useState(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (index > 0 && index >= count) {
      setIndex(Math.max(0, count - 1));
    }
  }, [count, index]);

  const activeIndex = Math.min(index, Math.max(0, count - 1));
  const activeItem = media[activeIndex] || null;
  const caption = resolveMediaCaption(section, activeIndex);
  const isCaptionShown = captionMode !== CAPTION_MODE_NONE && (Boolean(caption) || editable);
  // Sans légende, le média se centre : il n'y a plus de côté à laisser au texte.
  const position = isCaptionShown ? normalizeCaptionPosition(section?.captionPosition) : 'below';
  const width = dragWidth ?? storedWidth;

  const goTo = useCallback((nextIndex) => {
    setIndex(clampCarouselIndex(nextIndex, count));
  }, [count]);

  const handlePointerDown = useCallback((event) => {
    if (!editable || event.button > 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const stage = stageRef.current?.getBoundingClientRect();
    // Le bord fixe du média ne bouge pas pendant le geste : on le fige au départ, sinon la
    // largeur mesurée suivrait la largeur qu'elle est en train de modifier.
    dragRef.current = stage ? { left: stage.left, right: stage.right } : null;
    setDragWidth(storedWidth);
  }, [editable, storedWidth]);

  const handlePointerMove = useCallback((event) => {
    if (dragWidth === null) {
      return;
    }
    const container = containerRef.current?.getBoundingClientRect();
    const frozen = dragRef.current;
    if (!container || !frozen) {
      return;
    }
    setDragWidth(computeMediaWidthFromPointer({
      pointerX: event.clientX,
      containerLeft: container.left,
      containerWidth: container.width,
      mediaLeft: frozen.left,
      mediaRight: frozen.right,
      captionPosition: position
    }));
  }, [dragWidth, position]);

  const handlePointerUp = useCallback(() => {
    if (dragWidth === null) {
      return;
    }
    const finalWidth = dragWidth;
    setDragWidth(null);
    dragRef.current = null;
    if (finalWidth !== storedWidth) {
      onWidthChange?.(finalWidth);
    }
  }, [dragWidth, onWidthChange, storedWidth]);

  const handleHandleKeyDown = useCallback((event) => {
    const grow = position === 'left' ? 'ArrowLeft' : 'ArrowRight';
    const shrink = position === 'left' ? 'ArrowRight' : 'ArrowLeft';
    let next = null;
    if (event.key === grow || event.key === 'ArrowUp') {
      next = storedWidth + KEYBOARD_WIDTH_STEP;
    } else if (event.key === shrink || event.key === 'ArrowDown') {
      next = storedWidth - KEYBOARD_WIDTH_STEP;
    } else if (event.key === 'Home') {
      next = MIN_MEDIA_WIDTH;
    } else if (event.key === 'End') {
      next = MAX_MEDIA_WIDTH;
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    onWidthChange?.(clampMediaWidth(next));
  }, [onWidthChange, position, storedWidth]);

  const title = section?.title || '';
  const stageContent = activeItem ? (
    <div className="sg-media__slide" key={activeItem.id}>
      <MediaItem item={activeItem} title={title} t={t} />
    </div>
  ) : (
    <div className="sg-media__empty" style={{ '--sg-c': family.c }}>
      <MediaGlyph kind={MEDIA_KIND_IMAGE} />
      <span>{t('projectShowcase.mediaGallery.emptyLabel')}</span>
      {editable && <span className="sg-media__empty-hint">{t('projectShowcase.mediaGallery.emptyHint')}</span>}
    </div>
  );

  return (
    <section className="sg-band sg-band--light sg-band--pad" data-showcase-section="media-gallery">
      <div className="sg-wrap">
        <p className="sg-eyebrow sg-rv" style={{ '--sg-c': family.c }}>
          {t('projectShowcase.templates.mediaGallery.eyebrow')}
        </p>
        <h2 className="sg-headline sg-headline--sm sg-rv" style={{ '--sg-d': '80ms' }}>{titleNode}</h2>
        <div className="sg-media-host sg-rv" style={{ '--sg-d': '160ms' }}>
          <div
            ref={containerRef}
            className={`sg-media${dragWidth !== null ? ' is-resizing' : ''}`}
            data-caption-position={position}
            style={{ '--sg-media-w': `${width}%`, '--sg-c': family.c }}
            {...(count > 1 ? { role: 'region', 'aria-roledescription': 'carousel', 'aria-label': title || undefined } : {})}
          >
            <div ref={stageRef} className="sg-media__stage">
              <DocumentDropZone
                enabled={editable}
                isBusy={Boolean(dropZone?.isBusy)}
                progress={dropZone?.progress ?? null}
                label={dropZone?.label}
                busyLabel={dropZone?.busyLabel}
                onFiles={dropZone?.onFiles || (() => {})}
              >
                {stageContent}
              </DocumentDropZone>
              {count > 1 && (
                <>
                  <button
                    type="button"
                    className="sg-media__nav sg-media__nav--prev"
                    onClick={() => goTo(activeIndex - 1)}
                    aria-label={t('projectShowcase.mediaGallery.previous')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    type="button"
                    className="sg-media__nav sg-media__nav--next"
                    onClick={() => goTo(activeIndex + 1)}
                    aria-label={t('projectShowcase.mediaGallery.next')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <span className="sg-media__count" aria-live="polite">
                    {t('projectShowcase.mediaGallery.counter', { index: activeIndex + 1, count })}
                  </span>
                </>
              )}
              {editable && (
                <>
                  <span className="sg-media__width" aria-hidden="true">{width} %</span>
                  <div
                    className="sg-media__handle"
                    role="slider"
                    tabIndex={0}
                    aria-label={t('projectShowcase.mediaGallery.resizeHandle')}
                    aria-valuemin={MIN_MEDIA_WIDTH}
                    aria-valuemax={MAX_MEDIA_WIDTH}
                    aria-valuenow={width}
                    aria-valuetext={`${width} %`}
                    data-testid="media-gallery-resize-handle"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onKeyDown={handleHandleKeyDown}
                  >
                    <span />
                  </div>
                </>
              )}
            </div>
            {isCaptionShown && (
              <div className="sg-media__caption">
                {renderCaption ? renderCaption(activeIndex, caption) : caption}
              </div>
            )}
          </div>
          {count > 1 && (
            <div className="sg-media__dots">
              {media.map((item, dotIndex) => (
                <button
                  key={`${item.id}-dot`}
                  type="button"
                  className={dotIndex === activeIndex ? 'is-active' : ''}
                  aria-label={t('projectShowcase.mediaGallery.goTo', { index: dotIndex + 1 })}
                  aria-current={dotIndex === activeIndex ? 'true' : undefined}
                  onClick={() => goTo(dotIndex)}
                />
              ))}
            </div>
          )}
          {editable && error && <p className="sge-doc-error" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
};
