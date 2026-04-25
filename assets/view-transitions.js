(function () {
  const viewTransitionRenderBlocker = document.getElementById('view-transition-render-blocker');
  // Remove the view transition render blocker if the user has reduced motion enabled or is on a low power device.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLowPowerDevice()) {
    viewTransitionRenderBlocker?.remove();
  } else {
    // If the browser didn't manage to parse the main content quickly, at least let the user see something.
    // We're aiming for the FCP to be under 1.8 seconds since the navigation started.
    const RENDER_BLOCKER_TIMEOUT_MS = Math.max(0, 1800 - performance.now());

    setTimeout(() => {
      viewTransitionRenderBlocker?.remove();
    }, RENDER_BLOCKER_TIMEOUT_MS);
  }

  const idleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;

  window.addEventListener('pageswap', async (event) => {
    const { viewTransition } = /** @type {PageSwapEvent} */ (event);

    if (shouldSkipViewTransition(viewTransition)) {
      /** @type {ViewTransition | null} */ (viewTransition)?.skipTransition();
      return;
    }

    // Cancel view transition on user interaction to improve INP (Interaction to Next Paint)
    ['pointerdown', 'keydown'].forEach((eventName) => {
      document.addEventListener(
        eventName,
        () => {
          viewTransition.skipTransition();
        },
        { once: true }
      );
    });

    // Clean in case you landed on the pdp first. We want to remove the default transition type on the PDP media gallery so there is no duplicate transition name
    document
      .querySelectorAll('[data-view-transition-type]:not([data-view-transition-triggered])')
      .forEach((element) => {
        element.removeAttribute('data-view-transition-type');
      });

    // Ignore custom transitions to ensure the new smooth framer page reveal applies globally
    viewTransition.types.clear();
    viewTransition.types.add('page-navigation');
    sessionStorage.removeItem('custom-transition-type');
  });

  window.addEventListener('pagereveal', async (event) => {
    const { viewTransition } = /** @type {PageRevealEvent} */ (event);

    if (shouldSkipViewTransition(viewTransition)) {
      /** @type {ViewTransition | null} */ (viewTransition)?.skipTransition();
      return;
    }

    viewTransition.types.clear();
    viewTransition.types.add('page-navigation');
  });

  /**
   * @param {ViewTransition | null} viewTransition
   * @returns {viewTransition is null}
   */
  function shouldSkipViewTransition(viewTransition) {
    return !(viewTransition instanceof ViewTransition) || isLowPowerDevice();
  }

  /*
   * We can't import this logic from utilities.js here, but we should keep them in sync.
   */
  function isLowPowerDevice() {
    /* Skip ESLint compatibility check. Number(undefined) <= 2 is always false anyway. */
    /* eslint-disable-next-line compat/compat */
    return Number(navigator.hardwareConcurrency) <= 2 || Number(navigator.deviceMemory) <= 2;
  }
})();
