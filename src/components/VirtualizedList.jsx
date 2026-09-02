import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';

const DEFAULT_ESTIMATED_HEIGHT = 280;
const DEFAULT_OVERSCAN = 4;

const getKeyFromProp = (itemKey) => {
  if (typeof itemKey === 'function') {
    return itemKey;
  }

  if (typeof itemKey === 'string') {
    return (item) => (item ? item[itemKey] : undefined);
  }

  return (_item, index) => index;
};

const findStartIndex = (offsets, sizes, offset) => {
  let low = 0;
  let high = offsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const itemStart = offsets[mid];
    const itemEnd = itemStart + sizes[mid];

    if (itemEnd < offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, Math.min(low, offsets.length - 1));
};

const findEndIndex = (offsets, sizes, offset) => {
  let low = 0;
  let high = offsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const itemStart = offsets[mid];

    if (itemStart > offset) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, Math.min(low, offsets.length - 1));
};

export const VirtualizedList = ({
  items = [],
  itemKey,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  scrollContainerRef = null,
  className,
  role,
  renderItem
}) => {
  const containerRef = useRef(null);
  const sizeMapRef = useRef(new Map());
  const rafRef = useRef(null);
  const [measureVersion, setMeasureVersion] = useState(0);
  const [viewportState, setViewportState] = useState({
    scrollTop: 0,
    viewportHeight: 0,
    listTop: 0
  });

  const resolveKey = useMemo(() => getKeyFromProp(itemKey), [itemKey]);
  const itemKeys = useMemo(
    () => items.map((item, index) => resolveKey(item, index)),
    [items, resolveKey]
  );

  const itemSizes = useMemo(
    () => itemKeys.map((key) => sizeMapRef.current.get(key) || estimatedItemHeight),
    [itemKeys, estimatedItemHeight, measureVersion]
  );

  const itemOffsets = useMemo(() => {
    const offsets = [];
    let currentOffset = 0;
    for (let index = 0; index < itemSizes.length; index += 1) {
      offsets.push(currentOffset);
      currentOffset += itemSizes[index];
    }
    return offsets;
  }, [itemSizes]);

  const totalHeight = itemOffsets.length
    ? itemOffsets[itemOffsets.length - 1] + itemSizes[itemSizes.length - 1]
    : 0;

  const resolvedScrollContainerRef = useRef(null);

  const resolveScrollContainer = useCallback(() => {
    if (scrollContainerRef && scrollContainerRef.current) {
      return scrollContainerRef.current;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    if (!containerRef.current) {
      return window;
    }

    let parent = containerRef.current.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const isScrollable = /(auto|scroll|overlay)/.test(style.overflowY || '');
      if (isScrollable) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return window;
  }, [scrollContainerRef]);

  const handleViewportUpdate = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const scrollContainer = resolvedScrollContainerRef.current || resolveScrollContainer();
    resolvedScrollContainerRef.current = scrollContainer;
    const rect = containerRef.current.getBoundingClientRect();
    const isWindowContainer = !scrollContainer || scrollContainer === window;
    const scrollTop = isWindowContainer
      ? (window.scrollY || window.pageYOffset || 0)
      : scrollContainer.scrollTop;
    const viewportHeight = isWindowContainer
      ? (window.innerHeight || rect.height || 0)
      : scrollContainer.clientHeight;
    const listTop = isWindowContainer
      ? scrollTop + rect.top
      : (scrollTop + rect.top - scrollContainer.getBoundingClientRect().top);

    setViewportState((prev) => {
      if (
        prev.scrollTop === scrollTop &&
        prev.listTop === listTop &&
        prev.viewportHeight === viewportHeight
      ) {
        return prev;
      }
      return { scrollTop, listTop, viewportHeight };
    });
  }, [resolveScrollContainer]);

  const scheduleViewportUpdate = useCallback(() => {
    if (rafRef.current) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      handleViewportUpdate();
    });
  }, [handleViewportUpdate]);

  useEffect(() => {
    resolvedScrollContainerRef.current = resolveScrollContainer();
    handleViewportUpdate();
  }, [handleViewportUpdate, resolveScrollContainer, items.length]);

  useEffect(() => {
    const scrollContainer = resolveScrollContainer();
    resolvedScrollContainerRef.current = scrollContainer;
    const scrollTarget = !scrollContainer || scrollContainer === window ? window : scrollContainer;

    scrollTarget.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
    window.addEventListener('resize', scheduleViewportUpdate);

    return () => {
      scrollTarget.removeEventListener('scroll', scheduleViewportUpdate);
      window.removeEventListener('resize', scheduleViewportUpdate);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [resolveScrollContainer, scheduleViewportUpdate]);

  const updateItemSize = useCallback((key, nextSize) => {
    if (key === undefined || key === null || !Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    const previous = sizeMapRef.current.get(key);
    if (previous !== nextSize) {
      sizeMapRef.current.set(key, nextSize);
      setMeasureVersion((prev) => prev + 1);
    }
  }, []);

  const overscanPx = overscan * estimatedItemHeight;
  const relativeScrollTop = Math.max(0, viewportState.scrollTop - viewportState.listTop);
  const startOffset = Math.max(0, relativeScrollTop - overscanPx);
  const endOffset = relativeScrollTop + viewportState.viewportHeight + overscanPx;

  const startIndex = itemOffsets.length ? findStartIndex(itemOffsets, itemSizes, startOffset) : 0;
  const endIndex = itemOffsets.length ? findEndIndex(itemOffsets, itemSizes, endOffset) : -1;

  const visibleItems = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    if (!items[index]) {
      continue;
    }

    visibleItems.push({
      key: itemKeys[index],
      item: items[index],
      index,
      top: itemOffsets[index]
    });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      style={{ position: 'relative', minHeight: totalHeight }}
    >
      {visibleItems.map(({ key, item, index, top }) => (
        <VirtualizedRow
          key={key ?? index}
          itemKey={key ?? index}
          top={top}
          onSize={updateItemSize}
        >
          {renderItem(item, index)}
        </VirtualizedRow>
      ))}
    </div>
  );
};

const VirtualizedRow = ({ children, itemKey, top, onSize }) => {
  const rowRef = useRef(null);

  useEffect(() => {
    if (!rowRef.current) {
      return undefined;
    }

    const element = rowRef.current;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      onSize(itemKey, height);
    };

    measure();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(element);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [itemKey, onSize]);

  return (
    <div ref={rowRef} style={{ position: 'absolute', top, left: 0, right: 0 }}>
      {children}
    </div>
  );
};
