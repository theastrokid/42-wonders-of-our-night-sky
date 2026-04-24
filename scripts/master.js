// Homepage wonder dashboard:
// - Builds 14 rows of 3 interactive hover cards from wonders.json, grouped by episode.
// - Builds a separate row of bonus-wonder cards.
// - Each card lifts + tilts on mouse move, animates its rating bars on scroll-in.

(function () {
  'use strict';

  function ordinal(n) {
    if (n == null) return '';
    const v = n % 100;
    const s = ['th', 'st', 'nd', 'rd'];
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // JSON poster paths are relative to wonder pages ("../../assets/..."); on the
  // homepage we need them relative to the web root ("assets/...").
  function normaliseAsset(src) {
    if (!src) return '';
    return src.replace(/^(\.\.\/)+/, '');
  }
  function bust(src) {
    const path = normaliseAsset(src);
    if (!path) return '';
    return path + (path.includes('?') ? '&' : '?') + 'hv=24';
  }

  function statRow(axis, label, value, extraCls) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return `
      <div class="wcard__stat${extraCls ? ' ' + extraCls : ''}" data-axis="${axis}">
        <div class="wcard__stat-head">
          <span class="wcard__stat-label">${label}</span>
          <span class="wcard__stat-value" data-target="${v}">0</span>
        </div>
        <div class="wcard__stat-bar"><div class="wcard__stat-fill" style="--pct: ${v}%"></div></div>
      </div>`;
  }

  // Count up a number from 0 to target with the same ease curve as the bar
  function countUpValue(el, target, duration) {
    const start = performance.now();
    // cubic-bezier(0.16, 1, 0.3, 1) approximation — strong ease-out
    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuart(t);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderCard(w, opts = {}) {
    const r = w.ratings || {};
    const heroSrc = (w.hero && w.hero.poster) || '';
    const rankText = opts.bonus ? 'Bonus' : ordinal(w.wonderwallRank);
    return `
      <a class="wcard${opts.bonus ? ' wcard--bonus' : ''}" href="wonders/${w.slug}/index.html">
        <div class="wcard__frame">
          <div class="wcard__head">
            <h3 class="wcard__name">${w.title}</h3>
            <span class="wcard__rank">${rankText}</span>
          </div>
          <div class="wcard__media">
            <img src="${bust(heroSrc)}" alt="${w.title}" loading="lazy" />
          </div>
          <div class="wcard__stats">
            ${statRow('beauty',  'Beauty',  r.beauty)}
            ${statRow('power',   'Power',   r.power)}
            ${statRow('mystery', 'Mystery', r.mystery)}
            ${statRow('wonder',  'Wonder Rating', r.wonder, 'wcard__stat--wonder')}
          </div>
        </div>
      </a>`;
  }

  function episodeTitle(wonders) {
    const names = wonders.map((w) => w.title);
    if (names.length <= 3) return names.join(' · ');
    return names.slice(0, 3).join(' · ') + '…';
  }

  async function build() {
    const grid = document.getElementById('ep-grid');
    const bonusGrid = document.getElementById('bonus-grid');
    if (!grid) return;

    let data;
    try {
      const res = await fetch('data/wonders.json?v=24');
      data = await res.json();
    } catch (err) {
      grid.innerHTML = '<p style="color: var(--ink-3)">Wonder grid failed to load.</p>';
      return;
    }

    const byEpisode = {};
    for (const w of data.wonders) {
      if (!byEpisode[w.episode]) byEpisode[w.episode] = [];
      byEpisode[w.episode].push(w);
    }

    const rows = [];
    for (let ep = 1; ep <= 14; ep++) {
      const list = (byEpisode[ep] || []).sort((a, b) => (a.episodeReveal || 0) - (b.episodeReveal || 0));
      if (!list.length) continue;
      rows.push(`
        <section class="ep-row">
          <header class="ep-row__head">
            <div>
              <span class="ep-row__num">Episode ${String(ep).padStart(2, '0')}</span>
              <h3 class="ep-row__title">${episodeTitle(list)}</h3>
            </div>
            <span class="ep-row__count">${list.length} wonder${list.length === 1 ? '' : 's'}</span>
          </header>
          <div class="ep-row__grid">
            ${list.map((w) => renderCard(w)).join('')}
          </div>
        </section>
      `);
    }
    grid.innerHTML = rows.join('');

    if (bonusGrid && Array.isArray(data.bonusWonders)) {
      bonusGrid.innerHTML = data.bonusWonders
        .map((w) => renderCard(w, { bonus: true }))
        .join('');
    }

    initCards();
  }

  function initCards() {
    const cards = document.querySelectorAll('.wcard');
    if (!cards.length) return;

    const io = new IntersectionObserver(
      (entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            // Number count-up, synced with the 4500ms bar fill animation
            e.target.querySelectorAll('.wcard__stat-value[data-target]').forEach((el) => {
              const target = Number(el.dataset.target || 0);
              countUpValue(el, target, 4500);
            });
            o.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2 }
    );
    cards.forEach((c) => io.observe(c));

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rx = (0.5 - y) * 8;
        const ry = (x - 0.5) * 10;
        card.style.setProperty('--rx', `${rx}deg`);
        card.style.setProperty('--ry', `${ry}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Homepage hero video: loop between START and (duration - TAIL_CUT).
  // No auto-scroll.
  function initHomeHero() {
    const hero = document.querySelector('[data-home-hero]');
    const video = document.querySelector('[data-home-hero-video]');
    if (!hero || !video) return;

    const START = 2;
    const TAIL_CUT = 1;
    // We'll control looping manually so we can trim head + tail cleanly
    video.loop = false;

    const seekStart = () => {
      try { video.currentTime = START; } catch (e) {}
    };
    const apply = () => { seekStart(); };

    if (video.readyState >= 2) apply();
    else video.addEventListener('loadedmetadata', apply, { once: true });

    // When currentTime hits (duration - TAIL_CUT), jump back to START
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      if (video.currentTime >= video.duration - TAIL_CUT) {
        seekStart();
      }
    });
    // Safety net: if ended fires before timeupdate catches it, restart
    video.addEventListener('ended', () => {
      seekStart();
      video.play().catch(() => {});
    });

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {/* ignore autoplay rejection */});
    }
  }

  // Mouse-parallax tilt on the hero video poster (matches .wcard tilt feel).
  function initHeroTilt() {
    const wrap = document.querySelector('[data-hero-tilt]');
    if (!wrap) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const tx = (0.5 - y) * 4;   // rotateX
      const ty = (x - 0.5) * 6;   // rotateY
      wrap.style.setProperty('--htx', `${tx}deg`);
      wrap.style.setProperty('--hty', `${ty}deg`);
    });
    wrap.addEventListener('mouseleave', () => {
      wrap.style.setProperty('--htx', '0deg');
      wrap.style.setProperty('--hty', '0deg');
    });
  }

  // Count-up the four hero stat numbers (42 · 14 · 10 · 3) when the hero scrolls
  // into view. Staggered L-to-R with ease-out quart, matching the site's rhythm.
  function initHeroStats() {
    const stats = [...document.querySelectorAll('.m-hero__stat-value[data-stat]')];
    if (!stats.length) return;
    const hero = document.querySelector('[data-home-hero]');
    if (!hero) { stats.forEach((s) => (s.textContent = s.dataset.stat)); return; }

    const play = () => {
      stats.forEach((el, i) => {
        const target = Number(el.dataset.stat || 0);
        setTimeout(() => countUpValue(el, target, 1600), i * 140);
      });
    };

    const io = new IntersectionObserver(
      (entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) { play(); o.unobserve(e.target); }
        }
      },
      { threshold: 0.3 }
    );
    io.observe(hero);
  }

  function init() {
    initHomeHero();
    initHeroTilt();
    initHeroStats();
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
