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
    },
    // Lien d'aide permanent, affiché dès l'ouverture du guide : quelqu'un qui lance la visite
    // est précisément quelqu'un qui cherche de l'aide, et l'ouvrir ne doit pas lui faire perdre
    // le bouton qu'il avait sur l'écran d'accueil.
    helpLink: null
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
  // Une cible absente ou réduite à un point (l'ancre `sr-only` des étapes « menu ») n'a rien
  // à montrer : sans ce seuil, le halo dessinait un carré vide au centre de l'écran, par-dessus
  // un contenu sans rapport, ou un anneau dans le coin supérieur gauche.
  const MIN_TARGET_SIZE = 4;
  // Une cible qui apparaît un peu après l'entrée dans l'étape (écran monté en différé, section
  // dépliée par un effet) est encore cherchée pendant ce nombre d'images avant d'abandonner.
  const TARGET_RETRY_FRAMES = 45;
  const VIEWPORT_MARGIN = 16;
  const TALL_TARGET_RATIO = 0.8;

  const getViewportSize = () => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const getUsableTargetRect = (target) => {
    if (!target || typeof target.getBoundingClientRect !== 'function') {
      return null;
    }
    const rect = target.getBoundingClientRect();
    if (rect.width < MIN_TARGET_SIZE || rect.height < MIN_TARGET_SIZE) {
      return null;
    }
    return rect;
  };

  const intersectionArea = (a, b) => {
    const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return width > 0 && height > 0 ? width * height : 0;
  };

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

  const cloneHelpLink = (value) => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const href = typeof value.href === 'string' ? value.href.trim() : '';
    const label = typeof value.label === 'string' ? value.label.trim() : '';

    if (!href || !label) {
      return null;
    }

    return {
      href,
      label,
      ariaLabel: typeof value.ariaLabel === 'string' && value.ariaLabel.trim() ? value.ariaLabel.trim() : label
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
        helpLink: cloneHelpLink(options.helpLink),
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
      this.helpLinkElement = null;
      this.dotsElement = null;
      this.stepIndicator = null;
      this.actionsWrapper = null;
      this.controlsWrapper = null;
      this.actionsWrapper = null;
      this.controlsWrapper = null;
      this.currentTarget = null;
      this.pendingFrame = null;
      this.pendingPositionFrame = null;
      this.pendingTargetRetryFrame = null;
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

      this.cancelTargetRetry();

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

      const headerActions = document.createElement('div');
      headerActions.className = 'tgjs-header-actions';

      if (this.options.helpLink) {
        const helpLink = document.createElement('a');
        helpLink.className = 'tgjs-help';
        helpLink.href = this.options.helpLink.href;
        helpLink.target = '_blank';
        helpLink.rel = 'noopener noreferrer';
        helpLink.textContent = this.options.helpLink.label;
        helpLink.setAttribute('aria-label', this.options.helpLink.ariaLabel);
        headerActions.appendChild(helpLink);
        this.helpLinkElement = helpLink;
      }

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'tgjs-close';
      closeButton.textContent = this.options.labels.close;
      closeButton.addEventListener('click', () => {
        if (this.options.allowClose) {
          this.close();
        }
      });
      headerActions.appendChild(closeButton);
      header.appendChild(headerActions);

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

      this.cancelTargetRetry();

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

      if (!getUsableTargetRect(target) && typeof step.target === 'string' && step.target.trim()) {
        this.scheduleTargetRetry(step);
      }
    }

    cancelTargetRetry() {
      if (this.pendingTargetRetryFrame) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.pendingTargetRetryFrame);
        }
        this.pendingTargetRetryFrame = null;
      }
    }

    scheduleTargetRetry(step) {
      if (typeof requestAnimationFrame !== 'function') {
        return;
      }

      let remaining = TARGET_RETRY_FRAMES;
      const tick = () => {
        this.pendingTargetRetryFrame = null;
        if (!this.isActive || this.steps[this.currentStepIndex] !== step) {
          return;
        }
        const target = this.resolveTarget(step);
        if (getUsableTargetRect(target)) {
          this.currentTarget = target;
          this.updateHighlightPosition(step, target);
          this.updateTooltipPosition(step, target);
          return;
        }
        remaining -= 1;
        if (remaining > 0) {
          this.pendingTargetRetryFrame = requestAnimationFrame(tick);
        }
      };

      this.pendingTargetRetryFrame = requestAnimationFrame(tick);
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

    resolvePadding(step) {
      if (step && step.highlightScope === 'page') {
        return 0;
      }
      return typeof step?.highlightPadding === 'number'
        ? step.highlightPadding
        : this.options.highlightPadding;
    }

    updateHighlightPosition(step, target, triggerScroll = true) {
      if (!this.highlightElement) {
        return;
      }

      const highlightScope = step && step.highlightScope === 'page' ? 'page' : 'target';
      const viewport = getViewportSize();
      const targetRect = highlightScope === 'page' ? null : getUsableTargetRect(target);
      const isEmpty = highlightScope !== 'page' && !targetRect;

      this.highlightElement.classList.toggle('tgjs-highlight--page', highlightScope === 'page');
      this.highlightElement.classList.toggle('tgjs-highlight--empty', isEmpty);

      if (highlightScope === 'page') {
        this.setHighlightBox(0, 0, viewport.width, viewport.height);
        return;
      }

      if (isEmpty) {
        // Sans cible, tout l'écran reste assombri et la bulle se centre : un halo de 80 px
        // posé au hasard désignait un élément qui n'avait rien à voir avec l'étape.
        this.setHighlightBox(viewport.width / 2, viewport.height / 2, 0, 0);
        return;
      }

      const padding = this.resolvePadding(step);
      // Bornée horizontalement à l'écran : un bouton collé au bord droit (« Modifier » de la
      // vitrine, barre d'édition pleine largeur) perdait sinon le côté droit de son contour.
      const left = Math.max(2, targetRect.left - padding);
      const right = Math.min(viewport.width - 2, targetRect.right + padding);
      const top = Math.max(0, targetRect.top - padding);
      const height = targetRect.bottom + padding - top;
      this.setHighlightBox(left, top, right - left, height);

      if (!triggerScroll || typeof target.scrollIntoView !== 'function') {
        return;
      }

      const hasStepScrollOption = step && hasOwn.call(step, 'scrollIntoViewOptions');
      const scrollOptions = resolveScrollIntoViewOptions(
        hasStepScrollOption ? step.scrollIntoViewOptions : undefined,
        this.options.scrollIntoViewOptions
      );

      if (scrollOptions === false) {
        return;
      }

      const isTall = targetRect.height > viewport.height * TALL_TARGET_RATIO;
      const isInViewport =
        targetRect.top >= 0 &&
        targetRect.bottom <= viewport.height &&
        targetRect.left >= 0 &&
        targetRect.right <= viewport.width;
      // Une cible plus haute que l'écran n'y tient jamais entière : on en montre le début
      // plutôt que de la centrer, ce qui coupait son titre, et on ne la fait défiler que si ce
      // début n'est pas déjà affiché.
      const isStartVisible = targetRect.top >= 0 && targetRect.top <= viewport.height * 0.25;

      if (isInViewport || (isTall && isStartVisible)) {
        return;
      }

      const effectiveOptions = isTall ? { ...scrollOptions, block: 'start' } : scrollOptions;
      const scrollDuration = typeof step.scrollDuration === 'number' ? step.scrollDuration : undefined;
      const targetY = computeScrollTargetTop(target, effectiveOptions);

      if (isTall && typeof targetY === 'number' && typeof window !== 'undefined') {
        const offsetY = Math.max(0, targetY - VIEWPORT_MARGIN - padding);
        if (scrollDuration) {
          animateWindowScrollTo(offsetY, scrollDuration);
        } else {
          window.scrollTo({ top: offsetY, behavior: effectiveOptions.behavior || 'smooth' });
        }
        return;
      }

      if (scrollDuration && typeof targetY === 'number') {
        animateWindowScrollTo(targetY, scrollDuration);
        return;
      }

      try {
        target.scrollIntoView(effectiveOptions);
      } catch (error) {
        try {
          target.scrollIntoView(true);
        } catch (fallbackError) {
          target.scrollIntoView();
        }
      }
    }

    setHighlightBox(left, top, width, height) {
      this.highlightElement.style.top = `${top}px`;
      this.highlightElement.style.left = `${left}px`;
      this.highlightElement.style.width = `${Math.max(0, width)}px`;
      this.highlightElement.style.height = `${Math.max(0, height)}px`;
    }

    updateTooltipPosition(step, target) {
      if (!this.tooltipElement) {
        return;
      }

      const tooltip = this.tooltipElement;
      tooltip.style.top = '0px';
      tooltip.style.left = '0px';

      const tooltipRect = tooltip.getBoundingClientRect();
      const viewport = getViewportSize();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;
      const margin = VIEWPORT_MARGIN;
      const maxLeft = Math.max(margin, viewport.width - tooltipWidth - margin);
      const maxTop = Math.max(margin, viewport.height - tooltipHeight - margin);
      const clampLeft = (value) => Math.min(Math.max(value, margin), maxLeft);
      const clampTop = (value) => Math.min(Math.max(value, margin), maxTop);

      const highlightScope = step && step.highlightScope === 'page' ? 'page' : 'target';
      const rect = highlightScope === 'page' ? null : getUsableTargetRect(target);
      const requested = (step && step.placement ? String(step.placement) : 'auto').toLowerCase();

      let position = null;

      if (!rect || requested === 'center') {
        position = {
          top: (viewport.height - tooltipHeight) / 2,
          left: (viewport.width - tooltipWidth) / 2
        };
      } else {
        const gap = this.resolvePadding(step) + 16;
        const candidates = {
          bottom: {
            fits: rect.bottom + gap + tooltipHeight <= viewport.height - margin,
            top: rect.bottom + gap,
            left: clampLeft(rect.left)
          },
          top: {
            fits: rect.top - gap - tooltipHeight >= margin,
            top: rect.top - gap - tooltipHeight,
            left: clampLeft(rect.left)
          },
          right: {
            fits: rect.right + gap + tooltipWidth <= viewport.width - margin,
            top: clampTop(rect.top + rect.height / 2 - tooltipHeight / 2),
            left: rect.right + gap
          },
          left: {
            fits: rect.left - gap - tooltipWidth >= margin,
            top: clampTop(rect.top + rect.height / 2 - tooltipHeight / 2),
            left: rect.left - gap - tooltipWidth
          }
        };
        const order = {
          top: ['top', 'bottom', 'right', 'left'],
          left: ['left', 'right', 'bottom', 'top'],
          right: ['right', 'left', 'bottom', 'top']
        }[requested] || ['bottom', 'top', 'right', 'left'];

        const fitting = order.find((side) => candidates[side].fits);
        if (fitting) {
          position = candidates[fitting];
        } else {
          // Aucun côté libre (cible plus grande que l'écran, fenêtre modale…) : la bulle se
          // pose dans le coin qui masque le moins la partie visible de la cible, au lieu d'être
          // plaquée en haut de l'écran sur son titre.
          const visibleTarget = {
            left: Math.max(0, rect.left),
            top: Math.max(0, rect.top),
            width: Math.min(viewport.width, rect.right) - Math.max(0, rect.left),
            height: Math.min(viewport.height, rect.bottom) - Math.max(0, rect.top)
          };
          const centerLeft = (viewport.width - tooltipWidth) / 2;
          const corners = [
            { top: maxTop, left: maxLeft },
            { top: maxTop, left: centerLeft },
            { top: maxTop, left: margin },
            { top: margin, left: maxLeft },
            { top: margin, left: centerLeft },
            { top: margin, left: margin }
          ].map((corner) => ({ ...corner, width: tooltipWidth, height: tooltipHeight }));
          const overlaps = corners.map((corner) => intersectionArea(visibleTarget, corner));
          const minOverlap = Math.min(...overlaps);
          // À recouvrement quasi égal, on évite d'abord de masquer (plus qu'à moitié) un bouton
          // ou un champ de la cible, puis le bas de l'écran l'emporte : le haut d'une cible
          // porte son titre.
          const tolerance = tooltipWidth * tooltipHeight * 0.15;
          const controlRects = typeof target.querySelectorAll === 'function'
            ? Array.from(target.querySelectorAll('button, a[href], input, select, textarea, [role="button"]'))
              .map((element) => element.getBoundingClientRect())
              .filter((controlRect) => controlRect.width > 0 && controlRect.height > 0)
            : [];
          position = corners
            .map((corner, index) => ({
              corner,
              index,
              hiddenControls: controlRects.filter((controlRect) =>
                intersectionArea(controlRect, corner) > controlRect.width * controlRect.height * 0.5).length
            }))
            .filter(({ index }) => overlaps[index] <= minOverlap + tolerance)
            .sort((a, b) => a.hiddenControls - b.hiddenControls || a.index - b.index)[0].corner;
        }
      }

      tooltip.style.top = `${Math.round(clampTop(position.top))}px`;
      tooltip.style.left = `${Math.round(clampLeft(position.left))}px`;
    }
  }

  if (typeof window !== 'undefined') {
    window.TourGuideClient = TourGuideClient;
  }
})();
