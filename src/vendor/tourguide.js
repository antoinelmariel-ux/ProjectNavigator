(function () {
  const DEFAULT_SCROLL_OPTIONS = {
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  };

  const DEFAULT_OPTIONS = {
    allowClose: true,
    showStepDots: true,
    highlightPadding: 12,
    scrollIntoViewOptions: DEFAULT_SCROLL_OPTIONS,
    scrollDuration: undefined,
    labels: {
      next: 'Suivant',
      prev: 'Précédent',
      close: 'Fermer',
      finish: 'Terminer'
    }
  };

  const easeInOutCubic = (value) =>
    value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

  const sanitizeScrollDuration = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return undefined;
    }
    return numberValue;
  };

  let activeScrollAnimation = null;

  const cancelScrollAnimation = () => {
    if (activeScrollAnimation && typeof activeScrollAnimation.cancel === 'function') {
      activeScrollAnimation.cancel();
    }
    activeScrollAnimation = null;
  };

  const animateWindowScrollTo = (targetY, duration) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof duration !== 'number' || duration <= 0) {
      cancelScrollAnimation();
      window.scrollTo(0, targetY);
      return;
    }

    const requestFrame = window.requestAnimationFrame;
    const cancelFrame = window.cancelAnimationFrame;

    if (typeof requestFrame !== 'function') {
      cancelScrollAnimation();
      window.scrollTo(0, targetY);
      return;
    }

    const docElement = typeof document !== 'undefined' ? document.documentElement : null;
    const startY = window.pageYOffset || docElement?.scrollTop || 0;
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) {
      cancelScrollAnimation();
      window.scrollTo(0, targetY);
      return;
    }

    cancelScrollAnimation();

    const getNow = () =>
      (window.performance && typeof window.performance.now === 'function'
        ? window.performance.now()
        : Date.now());

    const startTime = getNow();

    const animationState = {
      requestId: null,
      active: true,
      cancel() {
        if (!this.active) {
          return;
        }
        this.active = false;
        if (typeof cancelFrame === 'function' && this.requestId !== null) {
          cancelFrame(this.requestId);
        }
      }
    };

    const step = (timestamp) => {
      if (!animationState.active) {
        return;
      }

      const currentTime = typeof timestamp === 'number' ? timestamp : getNow();
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeInOutCubic(progress);
      const nextY = startY + distance * easedProgress;

      window.scrollTo(0, nextY);

      if (progress < 1) {
        animationState.requestId = requestFrame(step);
      } else {
        animationState.active = false;
        activeScrollAnimation = null;
      }
    };

    animationState.requestId = requestFrame(step);
    activeScrollAnimation = animationState;
  };

  const computeScrollTargetTop = (element, scrollOptions) => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !element ||
      typeof element.getBoundingClientRect !== 'function'
    ) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    const currentScroll = window.pageYOffset || document.documentElement?.scrollTop || 0;
    const scrollHeight = Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
    const maxScroll = Math.max(0, scrollHeight - viewportHeight);

    const block = typeof scrollOptions?.block === 'string' ? scrollOptions.block.toLowerCase() : 'center';

    let targetY;

    if (block === 'start') {
      targetY = currentScroll + rect.top;
    } else if (block === 'end') {
      targetY = currentScroll + rect.bottom - viewportHeight;
    } else if (block === 'nearest') {
      const startTarget = currentScroll + rect.top;
      const endTarget = currentScroll + rect.bottom - viewportHeight;
      const distanceToStart = Math.abs(startTarget - currentScroll);
      const distanceToEnd = Math.abs(endTarget - currentScroll);
      targetY = distanceToStart <= distanceToEnd ? startTarget : endTarget;
    } else {
      const safeViewportHeight = viewportHeight > 0 ? viewportHeight : window.innerHeight;
      const elementHeight = Math.min(rect.height, safeViewportHeight || rect.height);
      const offset = ((safeViewportHeight || rect.height) - elementHeight) / 2;
      targetY = currentScroll + rect.top - offset;
    }

    if (!Number.isFinite(targetY)) {
      return null;
    }

    if (maxScroll === 0) {
      return Math.max(0, targetY);
    }

    if (targetY < 0) {
      return 0;
    }

    if (targetY > maxScroll) {
      return maxScroll;
    }

    return targetY;
  };

  const FRAME_DELAY = 2;

  const cloneLabels = (labels) => {
    if (!labels || typeof labels !== 'object') {
      return { ...DEFAULT_OPTIONS.labels };
    }

    return {
      next: typeof labels.next === 'string' ? labels.next : DEFAULT_OPTIONS.labels.next,
      prev: typeof labels.prev === 'string' ? labels.prev : DEFAULT_OPTIONS.labels.prev,
      close: typeof labels.close === 'string' ? labels.close : DEFAULT_OPTIONS.labels.close,
      finish: typeof labels.finish === 'string' ? labels.finish : DEFAULT_OPTIONS.labels.finish
    };
  };

  const cloneScrollIntoViewOptions = (value) => {
    if (value === false) {
      return false;
    }

    if (!value || typeof value !== 'object') {
      return { ...DEFAULT_SCROLL_OPTIONS };
    }

    return { ...DEFAULT_SCROLL_OPTIONS, ...value };
  };

  const ACTION_TYPES = new Set(['next', 'prev', 'close', 'finish', 'goTo']);

  const sanitizeAction = (action, index) => {
    if (!action || typeof action !== 'object') {
      return null;
    }

    const label = typeof action.label === 'string' ? action.label : '';
    const actionType = ACTION_TYPES.has(action.action) ? action.action : 'next';
    const stepId = typeof action.stepId === 'string' ? action.stepId : '';
    const variant = typeof action.variant === 'string' ? action.variant : 'ghost';

    return {
      id: typeof action.id === 'string' ? action.id : `action-${index + 1}`,
      label,
      action: actionType,
      stepId,
      variant
    };
  };

  const resolveScrollIntoViewOptions = (stepOption, defaultOption) => {
    if (stepOption === false) {
      return false;
    }

    if (stepOption && typeof stepOption === 'object') {
      return { ...DEFAULT_SCROLL_OPTIONS, ...stepOption };
    }

    if (defaultOption === false) {
      return false;
    }

    if (defaultOption && typeof defaultOption === 'object') {
      return { ...DEFAULT_SCROLL_OPTIONS, ...defaultOption };
    }

    return { ...DEFAULT_SCROLL_OPTIONS };
  };

  const hasOwn = Object.prototype.hasOwnProperty;

  const getStepOrder = (step, index) => {
    if (step && typeof step.order === 'number') {
      return step.order;
    }
    return index;
  };

  class TourGuideClient {
    constructor(options = {}) {
      const mergedOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
        labels: cloneLabels(options.labels),
        scrollIntoViewOptions: cloneScrollIntoViewOptions(options.scrollIntoViewOptions),
        scrollDuration: sanitizeScrollDuration(options.scrollDuration)
      };

      this.options = mergedOptions;
      this.steps = Array.isArray(options.steps)
        ? options.steps.map((step, index) => ({
            id: step && step.id ? String(step.id) : `step-${index + 1}`,
            order: getStepOrder(step, index),
            title: step && step.title ? String(step.title) : '',
            content: step && step.content ? String(step.content) : '',
            target: step ? step.target : null,
            placement: step && step.placement ? step.placement : 'auto',
            highlightScope: step && step.highlightScope === 'page' ? 'page' : 'target',
            highlightPadding:
              typeof step?.highlightPadding === 'number'
                ? step.highlightPadding
                : undefined,
            scrollIntoViewOptions:
              step && hasOwn.call(step, 'scrollIntoViewOptions')
                ? cloneScrollIntoViewOptions(step.scrollIntoViewOptions)
                : undefined,
            scrollDuration:
              step && hasOwn.call(step, 'scrollDuration')
                ? sanitizeScrollDuration(step.scrollDuration)
                : mergedOptions.scrollDuration,
            onBeforeStep: typeof step?.onBeforeStep === 'function' ? step.onBeforeStep : null,
            onAfterStep: typeof step?.onAfterStep === 'function' ? step.onAfterStep : null,
            showDefaultButtons: step?.showDefaultButtons !== false,
            actions: Array.isArray(step?.actions)
              ? step.actions.map(sanitizeAction).filter(Boolean)
              : []
          })
        ).sort((a, b) => getStepOrder(a, 0) - getStepOrder(b, 0))
        : [];

      this.currentStepIndex = -1;
      this.isActive = false;
      this.container = null;
      this.highlightElement = null;
      this.tooltipElement = null;
      this.titleElement = null;
      this.contentElement = null;
      this.prevButton = null;
      this.nextButton = null;
      this.closeButton = null;
      this.dotsElement = null;
      this.stepIndicator = null;
      this.actionsWrapper = null;
      this.controlsWrapper = null;
      this.actionsWrapper = null;
      this.controlsWrapper = null;
      this.currentTarget = null;
      this.pendingFrame = null;
      this.pendingPositionFrame = null;
      this.listeners = new Map();
      this.boundHandleWindowChange = this.handleWindowChange.bind(this);
      this.boundHandleKeydown = this.handleKeydown.bind(this);
    }

    on(eventName, callback) {
      if (typeof callback !== 'function') {
        return () => {};
      }

      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }

      const set = this.listeners.get(eventName);
      set.add(callback);

      return () => {
        set.delete(callback);
      };
    }

    emit(eventName, payload) {
      const listeners = this.listeners.get(eventName);
      if (!listeners || listeners.size === 0) {
        return;
      }

      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[TourGuide] Listener error:', error);
          }
        }
      });
    }

    start() {
      if (this.isActive) {
        this.goTo(0);
        return;
      }

      if (!Array.isArray(this.steps) || this.steps.length === 0) {
        return;
      }

      this.isActive = true;
      this.createElements();
      this.attachGlobalListeners();
      this.goTo(0);
    }

    stop() {
      if (!this.isActive) {
        return;
      }

      this.detachGlobalListeners();
      this.isActive = false;
      this.currentStepIndex = -1;
      this.currentTarget = null;

      if (this.pendingFrame) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.pendingFrame);
        }
        this.pendingFrame = null;
      }

      if (this.pendingPositionFrame) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.pendingPositionFrame);
        }
        this.pendingPositionFrame = null;
      }

      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
      this.highlightElement = null;
      this.tooltipElement = null;
      this.titleElement = null;
      this.contentElement = null;
      this.prevButton = null;
      this.nextButton = null;
      this.closeButton = null;
      this.dotsElement = null;
      this.stepIndicator = null;

      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('tgjs-open');
      }
    }

    close() {
      if (!this.isActive) {
        return;
      }
      this.stop();
      this.emit('close');
    }

    finish() {
      if (!this.isActive) {
        return;
      }
      this.stop();
      this.emit('finish');
    }

    goTo(index) {
      if (!this.isActive || !Array.isArray(this.steps)) {
        return;
      }

      const boundedIndex = Math.max(0, Math.min(index, this.steps.length - 1));
      this.showStep(boundedIndex);
    }

    next() {
      if (!this.isActive) {
        return;
      }

      const nextIndex = this.currentStepIndex + 1;
      if (nextIndex >= this.steps.length) {
        this.finish();
        return;
      }

      this.showStep(nextIndex);
    }

    prev() {
      if (!this.isActive) {
        return;
      }

      const prevIndex = this.currentStepIndex - 1;
      if (prevIndex < 0) {
        return;
      }

      this.showStep(prevIndex);
    }

    goToStepId(stepId) {
      if (!this.isActive || !stepId) {
        return;
      }

      const nextIndex = this.steps.findIndex(step => step.id === stepId);
      if (nextIndex === -1) {
        return;
      }

      this.showStep(nextIndex);
    }

    handleAction(action) {
      if (!action) {
        return;
      }

      switch (action.action) {
        case 'prev':
          this.prev();
          break;
        case 'close':
          this.close();
          break;
        case 'finish':
          this.finish();
          break;
        case 'goTo':
          this.goToStepId(action.stepId);
          break;
        case 'next':
        default:
          this.next();
          break;
      }
    }

    createElements() {
      if (typeof document === 'undefined') {
        return;
      }

      const container = document.createElement('div');
      container.className = 'tgjs-container';

      const highlight = document.createElement('div');
      highlight.className = 'tgjs-highlight';

      const tooltip = document.createElement('div');
      tooltip.className = 'tgjs-tooltip';

      const header = document.createElement('div');
      header.className = 'tgjs-tooltip__header';

      const title = document.createElement('h3');
      title.className = 'tgjs-title';
      header.appendChild(title);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'tgjs-close';
      closeButton.textContent = this.options.labels.close;
      closeButton.addEventListener('click', () => {
        if (this.options.allowClose) {
          this.close();
        }
      });
      header.appendChild(closeButton);

      const body = document.createElement('div');
      body.className = 'tgjs-tooltip__body';

      const content = document.createElement('p');
      content.className = 'tgjs-content';
      body.appendChild(content);

      const footer = document.createElement('div');
      footer.className = 'tgjs-tooltip__footer';

      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'tgjs-actions';

      const controlsWrapper = document.createElement('div');
      controlsWrapper.className = 'tgjs-controls';

      const prevButton = document.createElement('button');
      prevButton.type = 'button';
      prevButton.className = 'tgjs-button tgjs-button--ghost';
      prevButton.textContent = this.options.labels.prev;
      prevButton.addEventListener('click', () => this.prev());

      const stepIndicator = document.createElement('div');
      stepIndicator.className = 'tgjs-step-indicator';

      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.className = 'tgjs-button tgjs-button--primary';
      nextButton.textContent = this.options.labels.next;
      nextButton.addEventListener('click', () => this.next());

      controlsWrapper.appendChild(prevButton);
      controlsWrapper.appendChild(stepIndicator);
      controlsWrapper.appendChild(nextButton);

      footer.appendChild(actionsWrapper);
      footer.appendChild(controlsWrapper);

      if (this.options.showStepDots) {
        const dots = document.createElement('div');
        dots.className = 'tgjs-dots';
        this.dotsElement = dots;
        body.appendChild(dots);
      }

      tooltip.appendChild(header);
      tooltip.appendChild(body);
      tooltip.appendChild(footer);

      container.appendChild(highlight);
      container.appendChild(tooltip);

      document.body.appendChild(container);
      document.body.classList.add('tgjs-open');

      this.container = container;
      this.highlightElement = highlight;
      this.tooltipElement = tooltip;
      this.titleElement = title;
      this.contentElement = content;
      this.prevButton = prevButton;
      this.nextButton = nextButton;
      this.closeButton = closeButton;
      this.stepIndicator = stepIndicator;
      this.actionsWrapper = actionsWrapper;
      this.controlsWrapper = controlsWrapper;
    }

    attachGlobalListeners() {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.boundHandleWindowChange, true);
        window.addEventListener('scroll', this.boundHandleWindowChange, true);
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('keydown', this.boundHandleKeydown, true);
      }
    }

    detachGlobalListeners() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.boundHandleWindowChange, true);
        window.removeEventListener('scroll', this.boundHandleWindowChange, true);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', this.boundHandleKeydown, true);
      }
    }

    handleKeydown(event) {
      if (!this.isActive) {
        return;
      }

      if (event.key === 'Escape' && this.options.allowClose) {
        event.preventDefault();
        this.close();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.next();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prev();
      }
    }

    handleWindowChange() {
      if (!this.isActive) {
        return;
      }

      this.scheduleReposition();
    }

    scheduleReposition() {
      if (!this.isActive || this.pendingPositionFrame) {
        return;
      }

      if (typeof requestAnimationFrame !== 'function') {
        this.repositionCurrentStep();
        return;
      }

      this.pendingPositionFrame = requestAnimationFrame(() => {
        this.pendingPositionFrame = null;
        this.repositionCurrentStep();
      });
    }

    repositionCurrentStep() {
      if (!this.isActive || !this.container || !this.highlightElement || !this.tooltipElement) {
        return;
      }

      const step = this.steps[this.currentStepIndex];
      if (!step) {
        return;
      }

      const target = this.resolveTarget(step);
      this.currentTarget = target;
      this.updateHighlightPosition(step, target, false);
      this.updateTooltipPosition(step, target);
    }

    showStep(index) {
      if (!Array.isArray(this.steps)) {
        return;
      }

      const previousIndex = this.currentStepIndex;
      const previousStep = previousIndex >= 0 ? this.steps[previousIndex] : null;

      if (previousStep && typeof previousStep.onAfterStep === 'function') {
        try {
          previousStep.onAfterStep({
            step: previousStep,
            index: previousIndex,
            total: this.steps.length
          });
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[TourGuide] onAfterStep error:', error);
          }
        }
      }

      this.currentStepIndex = index;
      const step = this.steps[index];
      if (!step) {
        return;
      }

      const context = {
        step,
        index,
        total: this.steps.length,
        previousStep,
        previousIndex
      };

      if (typeof step.onBeforeStep === 'function') {
        try {
          step.onBeforeStep(context);
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[TourGuide] onBeforeStep error:', error);
          }
        }
      }

      this.emit('stepChange', context);
      this.scheduleRender(step);
    }

    scheduleRender(step) {
      if (!this.isActive || !step) {
        return;
      }

      if (this.pendingFrame) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.pendingFrame);
        }
        this.pendingFrame = null;
      }

      let remaining = FRAME_DELAY;
      const tick = () => {
        if (!this.isActive) {
          return;
        }
        if (remaining > 0) {
          remaining -= 1;
          this.pendingFrame = requestAnimationFrame(tick);
          return;
        }
        this.renderStep(step);
      };

      if (typeof requestAnimationFrame === 'function') {
        this.pendingFrame = requestAnimationFrame(tick);
      } else {
        setTimeout(() => this.renderStep(step), 16);
      }
    }

    resolveTarget(step) {
      if (!step) {
        return null;
      }

      if (step.target && typeof step.target === 'object' && typeof step.target.getBoundingClientRect === 'function') {
        return step.target;
      }

      if (typeof document === 'undefined') {
        return null;
      }

      if (typeof step.target === 'string' && step.target.trim().length > 0) {
        try {
          const element = document.querySelector(step.target);
          if (element) {
            return element;
          }
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[TourGuide] Invalid selector for target:', step.target);
          }
        }
      }

      return null;
    }

    renderStep(step) {
      if (!this.isActive || !this.container || !this.highlightElement || !this.tooltipElement) {
        return;
      }

      const target = this.resolveTarget(step);
      this.currentTarget = target;

      if (this.titleElement) {
        this.titleElement.textContent = step.title || '';
      }

      if (this.contentElement) {
        this.contentElement.textContent = step.content || '';
      }

      if (this.prevButton) {
        this.prevButton.disabled = this.currentStepIndex === 0;
      }

      if (this.nextButton) {
        const isLast = this.currentStepIndex === this.steps.length - 1;
        this.nextButton.textContent = isLast ? this.options.labels.finish : this.options.labels.next;
      }

      if (this.closeButton) {
        this.closeButton.style.display = this.options.allowClose ? 'inline-flex' : 'none';
      }

      if (this.controlsWrapper) {
        this.controlsWrapper.style.display = step.showDefaultButtons ? 'flex' : 'none';
      }

      if (this.actionsWrapper) {
        const actions = Array.isArray(step.actions) ? step.actions : [];
        this.actionsWrapper.innerHTML = '';
        if (actions.length === 0) {
          this.actionsWrapper.style.display = 'none';
        } else {
          this.actionsWrapper.style.display = 'flex';
          actions.forEach((action) => {
            const label = action.label
              || (action.action === 'prev'
                ? this.options.labels.prev
                : action.action === 'close'
                  ? this.options.labels.close
                  : action.action === 'finish'
                    ? this.options.labels.finish
                    : this.options.labels.next);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `tgjs-button ${action.variant === 'primary' ? 'tgjs-button--primary' : 'tgjs-button--ghost'}`;
            button.textContent = label;
            button.disabled = action.action === 'goTo' && !action.stepId;
            button.addEventListener('click', () => this.handleAction(action));
            this.actionsWrapper.appendChild(button);
          });
        }
      }

      if (this.stepIndicator) {
        this.stepIndicator.textContent = `${this.currentStepIndex + 1}/${this.steps.length}`;
      }

      if (this.dotsElement) {
        this.renderDots();
      }

      this.updateHighlightPosition(step, target);
      this.updateTooltipPosition(step, target);
    }

    renderDots() {
      if (!this.dotsElement) {
        return;
      }

      this.dotsElement.innerHTML = '';
      for (let index = 0; index < this.steps.length; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'tgjs-dot';
        if (index === this.currentStepIndex) {
          dot.classList.add('tgjs-dot--active');
        }
        this.dotsElement.appendChild(dot);
      }
    }

    updateHighlightPosition(step, target, triggerScroll = true) {
      if (!this.highlightElement) {
        return;
      }

      let rect;
      const highlightScope = step && step.highlightScope === 'page' ? 'page' : 'target';
      if (highlightScope === 'page') {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        rect = {
          top: 0,
          left: 0,
          width: viewportWidth,
          height: viewportHeight
        };
      } else if (target && typeof target.getBoundingClientRect === 'function') {
        rect = target.getBoundingClientRect();
      } else {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        rect = {
          top: centerY - 40,
          left: centerX - 40,
          width: 80,
          height: 80
        };
      }

      const padding = highlightScope === 'page'
        ? 0
        : typeof step.highlightPadding === 'number'
          ? step.highlightPadding
          : this.options.highlightPadding;

      const top = rect.top - padding;
      const left = rect.left - padding;
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;

      this.highlightElement.style.top = `${Math.max(0, top)}px`;
      this.highlightElement.style.left = `${Math.max(0, left)}px`;
      this.highlightElement.style.width = `${Math.max(0, width)}px`;
      this.highlightElement.style.height = `${Math.max(0, height)}px`;

      this.highlightElement.classList.toggle('tgjs-highlight--page', highlightScope === 'page');

      if (highlightScope === 'page' || !triggerScroll) {
        return;
      }

      if (target && typeof target.scrollIntoView === 'function') {
        const hasStepScrollOption = step && hasOwn.call(step, 'scrollIntoViewOptions');
        const scrollOptions = resolveScrollIntoViewOptions(
          hasStepScrollOption ? step.scrollIntoViewOptions : undefined,
          this.options.scrollIntoViewOptions
        );

        if (scrollOptions !== false) {
          const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
          const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
          const rectBottom = rect.top + rect.height;
          const rectRight = rect.left + rect.width;
          const isInViewport =
            rect.top >= 0 &&
            rectBottom <= viewportHeight &&
            rect.left >= 0 &&
            rectRight <= viewportWidth;

          if (!isInViewport) {
            const scrollDuration = typeof step.scrollDuration === 'number' ? step.scrollDuration : undefined;
            let didCustomScroll = false;

            if (scrollDuration) {
              const targetY = computeScrollTargetTop(target, scrollOptions);
              if (typeof targetY === 'number') {
                animateWindowScrollTo(targetY, scrollDuration);
                didCustomScroll = true;
              }
            }

            if (!didCustomScroll) {
              try {
                target.scrollIntoView(scrollOptions);
              } catch (error) {
                try {
                  target.scrollIntoView(true);
                } catch (fallbackError) {
                  target.scrollIntoView();
                }
              }
            }
          }
        }
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: Math.max(0, top - 120), behavior: 'smooth' });
      }
    }

    updateTooltipPosition(step, target) {
      if (!this.tooltipElement) {
        return;
      }

      const tooltip = this.tooltipElement;

      tooltip.style.top = '0px';
      tooltip.style.left = '0px';

      let rect;
      const highlightScope = step && step.highlightScope === 'page' ? 'page' : 'target';
      const padding = highlightScope === 'page'
        ? 0
        : typeof step.highlightPadding === 'number'
          ? step.highlightPadding
          : this.options.highlightPadding;
      if (target && typeof target.getBoundingClientRect === 'function') {
        rect = target.getBoundingClientRect();
      } else {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        rect = {
          top: viewportHeight / 2 - 40,
          left: viewportWidth / 2 - 40,
          width: 80,
          height: 80
        };
      }

      const tooltipRect = tooltip.getBoundingClientRect();

      const availableWidth = typeof window !== 'undefined' ? window.innerWidth : tooltipRect.width;
      const availableHeight = typeof window !== 'undefined' ? window.innerHeight : tooltipRect.height;

      let top = rect.bottom + padding + 16;
      let left = rect.left;

      const placement =
        highlightScope === 'page' && (!step.placement || step.placement === 'auto')
          ? 'center'
          : (step.placement || 'auto').toLowerCase();

      if (placement === 'top') {
        top = rect.top - tooltipRect.height - padding - 16;
      } else if (placement === 'left') {
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - padding - 16;
      } else if (placement === 'right') {
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + padding + 16;
      } else if (placement === 'center') {
        top = (availableHeight - tooltipRect.height) / 2;
        left = (availableWidth - tooltipRect.width) / 2;
      } else {
        if (top + tooltipRect.height > availableHeight - 16) {
          top = rect.top - tooltipRect.height - padding - 16;
        }
      }

      if (left + tooltipRect.width > availableWidth - 16) {
        left = availableWidth - tooltipRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }

      if (top < 16) {
        top = 16;
      }

      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.style.left = `${Math.round(left)}px`;
    }
  }

  if (typeof window !== 'undefined') {
    window.TourGuideClient = TourGuideClient;
  }
})();
