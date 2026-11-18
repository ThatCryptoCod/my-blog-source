/* ==========================================================
   钻石剑光标 + 左键三段连击（姿态衔接）+ 右键举剑 + 火焰
   ========================================================== */
(() => {
  'use strict';

  /* ---------------- 可调参数 ---------------- */
  const GHOST_STEP  = 20;
  const GHOST_LIFE  = 220;
  const BLOCK_MS    = 380;
  const COMBO_RESET = 1200;

  const ATTACKS = [
    { name: 'sword-slash-1', ms: 520, end: -130 }, // 下劈，收在 -130°
    { name: 'sword-slash-2', ms: 520, end: 20   }, // 上撩，收在 +20°
    { name: 'sword-slash-3', ms: 460, end: 0    }, // 突刺，收势回 0°
  ];

  const FIRE_MS     = 320;
  const FIRE_TURNS  = 3;
  const FIRE_RADIUS = 7;

  const FIRE_COLORS = ['#fffbe6', '#ffe066', '#ffb300', '#ff7a00', '#ff4400', '#d61a00'];

  /* ---------------- 工具 ---------------- */
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
    /* ---------------- 图层 ---------------- */
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

    /* ---------------- 收势姿态 ---------------- */
    let stance = 0;

    const setStance = (deg) => {
      stance = deg;
      if (cursor) cursor.style.rotate = `${deg}deg`;
    };

    /* ---------------- 文章页开关 ---------------- */
    const syncMode = () => {
      const next = finePointer && !isArticlePage();
      if (next === enabled) return;

      enabled = next;
      document.documentElement.classList.toggle('mc-sword-on', enabled);

      if (!enabled) {
        if (cursor) {
          cursor.classList.remove('is-visible');
          cursor.classList.remove('is-swinging');
        }
        setStance(0);
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

    /* ---------------- 连击状态 ---------------- */
    let combo = 0;
    let resetTimer = 0;

    const scheduleReset = () => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        combo = 0;
        setStance(0);
      }, COMBO_RESET);
    };

    /* ---------------- 剑柄 / 剑尖参数 ---------------- */
    const bladeConfig = () => {
      const cs = getComputedStyle(layer);
      return {
        hx:    (parseFloat(cs.getPropertyValue('--hilt-x')) || 82) / 100 * 64,
        hy:    (parseFloat(cs.getPropertyValue('--hilt-y')) || 76) / 100 * 64,
        len:   parseFloat(cs.getPropertyValue('--blade-len')) || 46,
        angle: (parseFloat(cs.getPropertyValue('--blade-angle')) || -137) * Math.PI / 180,
      };
    };

    /* ---------------- 火焰粒子 ---------------- */
    const spawnFire = (x, y, t, vx, vy, scale = 1) => {
      const size = Math.max(2, Math.round((3 + Math.random() * 3) * scale));
      const idx  = Math.min(FIRE_COLORS.length - 1, Math.floor(t * FIRE_COLORS.length));

      const s = document.createElement('span');
      s.className = 'mc-spark';
      s.style.left = `${x - size / 2}px`;
      s.style.top  = `${y - size / 2}px`;
      s.style.setProperty('--s', `${size}px`);
      s.style.setProperty('--c', FIRE_COLORS[idx]);
      s.style.setProperty('--dx', `${vx ?? (Math.random() - 0.5) * 16}px`);
      s.style.setProperty('--dy', `${vy ?? (-10 - Math.random() * 22)}px`);
      s.style.setProperty('--d', `${320 + Math.random() * 300}ms`);

      layer.appendChild(s);
      s.addEventListener('animationend', () => s.remove(), { once: true });
      setTimeout(() => s.remove(), 900);
    };

    /* ---------------- 方形闪光 ---------------- */
    const flashAt = (x, y, size, color, ms) => {
      const f = document.createElement('span');
      f.className = 'mc-flash';
      f.style.left = `${x - size / 2}px`;
      f.style.top  = `${y - size / 2}px`;
      f.style.setProperty('--f', `${size}px`);
      f.style.setProperty('--c', color);
      f.style.setProperty('--d', `${ms}ms`);

      layer.appendChild(f);
      f.addEventListener('animationend', () => f.remove(), { once: true });
      setTimeout(() => f.remove(), ms + 300);
    };

    /* ---------------- 双螺旋火焰 ---------------- */
    const bladeFire = (x, y, sword) => {
      const cfg = bladeConfig();
      const bx = x - 32 + cfg.hx;
      const by = y - 32 + cfg.hy;

      flashAt(bx, by, 24, '#ffd166', 240);
      for (let i = 0; i < 10; i++) {
        const ang  = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 12;
        spawnFire(bx, by, 0.05, Math.cos(ang) * dist, Math.sin(ang) * dist, 1);
      }

      const start = performance.now();
      let lastSpawn = -Infinity;
      let burstDone = false;

      const tick = () => {
        if (!sword.isConnected) return;

        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / FIRE_MS);

        const a = cfg.angle + getAngle(sword) * Math.PI / 180;

        const along = t * cfg.len;
        const phase = t * Math.PI * 2 * FIRE_TURNS;

        const l1 = Math.sin(phase) * FIRE_RADIUS;
        const l2 = Math.sin(phase + Math.PI) * FIRE_RADIUS;

        const p1x = bx + Math.cos(a) * along - Math.sin(a) * l1;
        const p1y = by + Math.sin(a) * along + Math.cos(a) * l1;
        const p2x = bx + Math.cos(a) * along - Math.sin(a) * l2;
        const p2y = by + Math.sin(a) * along + Math.cos(a) * l2;

        if (elapsed - lastSpawn >= 14) {
          lastSpawn = elapsed;
          spawnFire(p1x, p1y, t, undefined, undefined, 1.15);
          spawnFire(p2x, p2y, t, undefined, undefined, 0.8);
        }

        if (t < 1) {
          requestAnimationFrame(tick);
          return;
        }

        if (burstDone) return;
        burstDone = true;

        flashAt(p1x, p1y, 52, '#ffe066', 340);

        for (let i = 0; i < 20; i++) {
          const ang  = Math.random() * Math.PI * 2;
          const dist = 16 + Math.random() * 36;
          spawnFire(p1x, p1y, 0.7 + Math.random() * 0.3,
            Math.cos(ang) * dist, Math.sin(ang) * dist, 1);
        }

        for (let i = 0; i < 6; i++) {
          spawnFire(
            p1x + (Math.random() - 0.5) * 20,
            p1y + (Math.random() - 0.5) * 20,
            0.9,
            (Math.random() - 0.5) * 8,
            -22 - Math.random() * 24,
            0.8
          );
        }
      };

      requestAnimationFrame(tick);
    };

    /* ---------------- 右键举剑 ---------------- */
    const doBlock = (x, y) => {
      // 举剑会打断连击
      clearTimeout(resetTimer);
      combo = 0;

      const prev = stance;

      // 举剑最终角度（默认 -90 - (-137) = 47°）
      const angleDeg = bladeConfig().angle * 180 / Math.PI;
      const blockEnd = -90 - angleDeg;

      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.add('is-swinging');

      // 先把它藏到举剑结束的角度，等光标恢复时正好接上
      setStance(blockEnd);

      const block = document.createElement('div');
      block.className = 'sword-block';
      block.style.left = `${x}px`;
      block.style.top  = `${y}px`;
      block.style.setProperty('--from-angle', `${prev}deg`);
      layer.appendChild(block);

      bladeFire(x, y, block);

      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        cursor.classList.remove('is-swinging');
        setStance(0);
      }, BLOCK_MS);

      block.addEventListener('animationend', () => block.remove(), { once: true });
      setTimeout(() => block.remove(), BLOCK_MS + 300);
    };

    /* ---------------- 左键连击 / 右键举剑 ---------------- */
    document.addEventListener('pointerdown', (e) => {
      if (e.button === 2) {
        if (enabled) doBlock(e.clientX, e.clientY);
        return;
      }

      if (e.button !== 0) return;
      if (!enabled) return;

      const x = e.clientX;
      const y = e.clientY;

      const attack = ATTACKS[combo % ATTACKS.length];
      combo = (combo + 1) % ATTACKS.length;
      scheduleReset();

      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.add('is-swinging');

      // 光标收势直接切到这一段结束的角度，藏起来看不见切换
      setStance(attack.end);

      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        cursor.classList.remove('is-swinging');
      }, attack.ms);

      const slash = document.createElement('div');
      slash.className = 'sword-slash';
      slash.style.left = `${x}px`;
      slash.style.top  = `${y}px`;
      slash.style.animation = `${attack.name} ${attack.ms}ms ease-in-out forwards`;
      layer.appendChild(slash);

      const start = performance.now();
      let lastGhost = -Infinity;

      const tick = (time) => {
        if (!slash.isConnected) return;

        const elapsed = time - start;
        if (elapsed >= attack.ms) return;

        if (elapsed - lastGhost >= GHOST_STEP) {
          lastGhost = elapsed;

          const ghost = document.createElement('div');
          ghost.className = 'sword-slash-ghost';
          ghost.style.left = `${x}px`;
          ghost.style.top  = `${y}px`;
          ghost.style.transform = getComputedStyle(slash).transform;

          layer.insertBefore(ghost, slash);
          setTimeout(() => ghost.remove(), GHOST_LIFE);
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);

      slash.addEventListener('animationend', () => slash.remove(), { once: true });
      setTimeout(() => slash.remove(), attack.ms + 300);
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();