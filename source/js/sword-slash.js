/* ==========================================================
   钻石剑光标 + 预备30° + 逆时针130° + 残影拖尾
   文章页自动关闭
   ========================================================== */
(() => {
  'use strict';

  const SWING_MS   = 520;   // 和 CSS 的 0.52s 一致
  const GHOST_STEP = 20;
  const GHOST_LIFE = 220;

  const getAngle = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = new DOMMatrixReadOnly(t);
    return Math.atan2(m.b, m.a) * 180 / Math.PI;
  };

  const isArticlePage = () => {
    if (document.body.classList.contains('post')) return true;
    if (document.querySelector('meta[property="og:type"][content="article"]')) return true;
    return !!document.querySelector('#post, #article-container, article.post, .post-content');
  };

  const init = () => {
    const layer = document.createElement('div');
    layer.className = 'sword-slash-container';
    document.body.appendChild(layer);

    const finePointer = window.matchMedia('(pointer: fine)').matches;

    let cursor = null;
    let enabled = false;
    let restoreTimer = 0;

    if (finePointer) {
      cursor = document.createElement('div');
      cursor.className = 'mc-sword-cursor';
      document.body.appendChild(cursor);
    }

    const syncMode = () => {
      const next = finePointer && !isArticlePage();
      if (next === enabled) return;

      enabled = next;
      document.documentElement.classList.toggle('mc-sword-on', enabled);

      if (!enabled && cursor) {
        cursor.classList.remove('is-visible');
        cursor.classList.remove('is-swinging');
      }
    };

    syncMode();

    ['pjax:complete', 'pjax:end', 'pjax:success'].forEach((name) => {
      document.addEventListener(name, syncMode);
    });
    window.addEventListener('popstate', syncMode);

    /* ---------------- 光标 ---------------- */
    let mx = -100;
    let my = -100;
    let raf = 0;
    let lastSync = 0;

    const paint = () => {
      raf = 0;
      if (cursor && enabled) {
        cursor.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      }
    };

    document.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - lastSync > 600) {
        lastSync = now;
        syncMode();
      }

      if (!enabled) return;

      mx = e.clientX;
      my = e.clientY;

      if (!raf) raf = requestAnimationFrame(paint);
      cursor.classList.add('is-visible');
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => {
      if (cursor) cursor.classList.remove('is-visible');
    });

    /* ---------------- 点击：劈砍 + 残影 ---------------- */
    document.addEventListener('pointerdown', (e) => {
      if (!enabled) return;
      if (e.button !== 0) return;

      const x = e.clientX;
      const y = e.clientY;

      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.add('is-swinging');

      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        cursor.classList.remove('is-swinging');
      }, SWING_MS);

      const slash = document.createElement('div');
      slash.className = 'sword-slash';
      slash.style.left = `${x}px`;
      slash.style.top  = `${y}px`;
      layer.appendChild(slash);

      const start = performance.now();
      let lastGhost = -Infinity;

      const tick = (now) => {
        if (!slash.isConnected) return;

        const elapsed = now - start;
        if (elapsed >= SWING_MS) return;

        if (elapsed - lastGhost >= GHOST_STEP) {
          lastGhost = elapsed;

          const ghost = document.createElement('div');
          ghost.className = 'sword-slash-ghost';
          ghost.style.left = `${x}px`;
          ghost.style.top  = `${y}px`;
          ghost.style.transform = `rotate(${getAngle(slash)}deg)`;

          layer.insertBefore(ghost, slash);
          setTimeout(() => ghost.remove(), GHOST_LIFE);
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);

      slash.addEventListener('animationend', () => slash.remove(), { once: true });
      setTimeout(() => slash.remove(), SWING_MS + 300);
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();