// Hydrate a wonder page from data/wonders.json driven by body[data-slug].
// Flow: hero, overview (specs + BPM + Wonder Rating + Ranked), What is it +
// How to find, How to spot (sky map + data), Key facts (fun fact + tiles),
// Pull quote, Interactive tier comparator, Finale (wall clip + ring meters).

(function () {
  'use strict';

  async function loadData() {
    // Always hit network (or revalidate) so content updates propagate immediately
    const res = await fetch('../../data/wonders.json?v=' + Date.now(), { cache: 'no-store' });
    return res.json();
  }

  function findWonder(data, slug) {
    return data.wonders.find((w) => w.slug === slug)
        || (data.bonusWonders || []).find((w) => w.slug === slug);
  }

  function titleCase(s) {
    return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const setText = (sel, text) => {
    const el = document.querySelector(sel);
    if (el && text != null) el.textContent = text;
  };

  function renderHero(w) {
    document.title = `${w.title} · 42 Wonders of Our Night Sky`;
    setText('[data-hero-title]', w.title);
    setText('[data-hero-headline]', w.hero.headline);
    setText('[data-hero-episode]', w.clip.episode);
    setText('[data-hero-time]', w.clip.episodeTimestamp);
    setText('[data-hero-designation]', w.designation);
    setText('[data-hero-kind]', w.kind);

    const video = document.querySelector('[data-hero] video');
    const poster = document.querySelector('[data-hero] .w-hero__poster');
    // Cache-bust hero poster whenever JS is loaded so swaps-on-disk propagate.
    const bust = (src) => src + (src.includes('?') ? '&' : '?') + 'hv=20';
    if (video) {
      video.dataset.deferredSrc = w.clip.full;
      video.poster = bust(w.hero.poster);
    }
    if (poster) poster.src = bust(w.hero.poster);
  }

  function renderOverview(w) {
    const o = w.overview || {};
    setText('[data-spec-magnitude]', o.magnitude || '·');
    setText('[data-spec-object-type]', o.objectType || w.kind || '·');
    setText('[data-spec-distance]', o.distance || '·');

    const r = w.ratings || {};
    const setTarget = (key, val) => {
      const el = document.querySelector(`.w-overview [data-rating-value="${key}"]`);
      if (!el) return;
      el.dataset.ratingTarget = val;
      el.textContent = '0';
    };
    setTarget('beauty',  r.beauty  || 0);
    setTarget('power',   r.power   || 0);
    setTarget('mystery', r.mystery || 0);
    setTarget('wonder',  r.wonder  || 0);

    const rankEl = document.querySelector('[data-overview-rank]');
    if (rankEl && w.wonderwallRank) {
      rankEl.textContent = ordinal(w.wonderwallRank);
    }
  }

  function ordinal(n) {
    const v = n % 100;
    const s = ["th", "st", "nd", "rd"];
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function renderProse(sel, paragraphs, cap) {
    const mount = document.querySelector(sel);
    if (!mount) return;
    const arr = Array.isArray(paragraphs) ? paragraphs : paragraphs ? [paragraphs] : [];
    const limited = cap ? arr.slice(0, cap) : arr;
    mount.innerHTML = limited
      .map((p) => (typeof p === 'string' ? `<p>${p}</p>` : `<p>${p.text || ''}</p>`))
      .join('');
  }

  function renderHowToFind(w) {
    const video = document.querySelector('[data-howfind-video]');
    const caption = document.querySelector('[data-howfind-caption]');
    const cfg = w.howToFindClip || {};
    if (video && cfg.src) {
      if (cfg.startAt != null) video.dataset.startAt = cfg.startAt;
      if (cfg.playbackRate != null) video.dataset.playbackRate = cfg.playbackRate;
      video.src = cfg.src;
    }
    if (caption) caption.textContent = cfg.caption || '';
  }

  function renderHowSpot(kf) {
    const section = document.querySelector('[data-howspot-section]');
    const mount = document.querySelector('[data-howspot-mount]');
    if (!section || !mount) return;
    const hasMap = !!kf?.skyMap?.src;
    const hasTable = Array.isArray(kf?.dataTable) && kf.dataTable.length > 0;
    if (!hasMap && !hasTable) { section.hidden = true; mount.hidden = true; return; }
    section.hidden = false;
    mount.hidden = false;

    if (hasMap) {
      const img = mount.querySelector('[data-howspot-img]');
      const cap = mount.querySelector('[data-howspot-caption]');
      if (img) {
        img.src = kf.skyMap.src;
        img.alt = kf.skyMap.alt || `Sky map showing where to find this wonder`;
      }
      if (cap) cap.textContent = kf.skyMap.caption || '';
    } else {
      const fig = mount.querySelector('.w-howspot__map');
      if (fig) fig.hidden = true;
    }

    const dl = mount.querySelector('[data-howspot-data]');
    if (dl && hasTable) {
      dl.innerHTML = kf.dataTable
        .map((row) => {
          const label = (row.label || '').toLowerCase();
          const val = row.value || '';
          const mods = [];
          if (row.mono) mods.push('w-howspot__row--mono');
          if (row.coords) mods.push('w-howspot__row--coords');

          // Special rendering for visibility (gold star string) + naked eye (yes/no colour)
          let valueHtml = val;
          if (label.startsWith('visibility')) {
            mods.push('w-howspot__row--stars');
            const lit = (val.match(/★/g) || []).length;
            const total = Math.max(lit, 5);
            let html = '';
            for (let i = 0; i < total; i++) html += i < lit ? '★' : '<span class="dim">★</span>';
            valueHtml = html;
          } else if (label.includes('naked')) {
            if (/^yes/i.test(val)) mods.push('w-howspot__row--yes');
            else if (/^no/i.test(val)) mods.push('w-howspot__row--no');
          }

          const cls = ['w-howspot__row', ...mods].join(' ');
          return `
            <div class="${cls}">
              <dt>${row.label || ''}${row.note ? ` <span class="hint">${row.note}</span>` : ''}</dt>
              <dd>${valueHtml}</dd>
            </div>`;
        })
        .join('');
    }
  }

  function renderKeyFacts(w) {
    const kf = w.keyFacts;
    const section = document.querySelector('[data-keyfacts-section]');
    renderHowSpot(kf);

    if (!section) return;
    if (!kf) { section.hidden = true; return; }

    const hasFun = !!kf.funFact;
    const hasTiles = Array.isArray(kf.tiles) && kf.tiles.length > 0;
    if (!hasFun && !hasTiles) { section.hidden = true; return; }
    section.hidden = false;

    const funMount = document.querySelector('[data-funfact-mount]');
    const funText = document.querySelector('[data-funfact-text]');
    if (hasFun) {
      if (funMount) funMount.hidden = false;
      if (funText) funText.textContent = kf.funFact;
    } else if (funMount) {
      funMount.hidden = true;
    }

    const grid = document.querySelector('[data-keyfacts-grid]');
    if (grid) {
      if (hasTiles) {
        grid.innerHTML = kf.tiles
          .map(
            (t) => `
            <div class="w-keyfact" data-accent="${t.accent || 'gold'}">
              <span class="w-keyfact__label">${t.label || ''}</span>
              <span class="w-keyfact__value">${t.value || ''}</span>
              ${t.hint ? `<span class="w-keyfact__hint">${t.hint}</span>` : ''}
            </div>`
          )
          .join('');
        grid.hidden = false;
      } else {
        grid.hidden = true;
      }
    }
  }

  function renderPullQuote(w) {
    const section = document.querySelector('[data-pullquote-section]');
    if (!section) return;
    const q = w.features?.specialQuote || w.features?.quoteA || null;
    if (!q) { section.hidden = true; return; }
    section.hidden = false;
    setText('[data-pullquote-text]', `"${q.text}"`);
    setText('[data-pullquote-attr]', q.attribution || 'Damon Scotting');
  }

  const TIER_PRICE = { '500': '$500', '1m': '$1,000,000', '1b': '$1,000,000,000' };

  function renderTiers(w) {
    const intro = document.querySelector('[data-tiers-intro]');
    if (intro) intro.textContent = w.tiersIntro || '';

    const mount = document.querySelector('[data-compare-mount]');
    if (!mount) return;
    const tiers = w.telescopes || [];
    if (!tiers.length) { mount.hidden = true; return; }

    const tabsHtml = tiers
      .map(
        (t, i) => `
        <button class="w-compare__tab${i === 0 ? ' is-active' : ''}" type="button" data-tier="${t.tier}">
          <span class="price">${TIER_PRICE[t.tier] || t.tier}</span>
          <span class="device">${t.device || ''}</span>
        </button>`
      )
      .join('');

    const bust = (src) => src + (src.includes('?') ? '&' : '?') + 'tv=24';
    const stageHtml = tiers
      .map(
        (t, i) => `
        <img class="w-compare__img${i === 0 ? ' is-active' : ''}"
             data-tier="${t.tier}"
             src="${bust(t.image)}"
             alt="${w.title} through ${t.device}"
             loading="${i === 0 ? 'eager' : 'lazy'}"
             decoding="async" />`
      )
      .join('');

    const progressHtml = tiers
      .map((t, i) => `<div class="w-compare__progress-dot${i === 0 ? ' is-active' : ''}" data-tier="${t.tier}"></div>`)
      .join('');

    const first = tiers[0] || {};
    mount.innerHTML = `
      <div class="w-compare__tabs" role="tablist">${tabsHtml}</div>
      <div class="w-compare__stage">
        <span class="w-compare__badge" data-compare-badge>
          <span class="price" data-compare-badge-price>${TIER_PRICE[first.tier] || ''}</span>
          <span data-compare-badge-device>${first.device || ''}</span>
        </span>
        ${stageHtml}
      </div>
      <div class="w-compare__progress">${progressHtml}</div>
      <p class="w-compare__caption" data-compare-caption>${first.caption || ''}</p>
      <p class="w-compare__tech" data-compare-tech>${first.tech || ''}</p>`;

    // Stash tier meta on mount so wonder.js can swap captions without re-reading JSON
    mount._tiers = tiers.reduce((acc, t) => {
      acc[t.tier] = t;
      return acc;
    }, {});
  }

  function renderFinale(w) {
    const quote = w.features?.finalQuote || w.features?.quoteB || null;
    if (quote) {
      setText('[data-final-quote-text]', `"${quote.text}"`);
      setText('[data-final-quote-attribution]', quote.attribution || 'Damon Scotting');
    }

    const wall = w.wallClip;
    const wallMount = document.querySelector('[data-wall-mount]');
    if (wallMount) {
      if (wall?.src) {
        wallMount.hidden = false;
        const v = wallMount.querySelector('[data-wall-video]');
        if (v) {
          v.src = wall.src;
          if (wall.startAt != null) v.dataset.startAt = wall.startAt;
          if (wall.playbackRate != null) v.dataset.playbackRate = wall.playbackRate;
        }
        const rankNum = wallMount.querySelector('[data-wall-rank-num]');
        if (rankNum && w.wonderwallRank) rankNum.textContent = `#${w.wonderwallRank}`;
      } else {
        wallMount.hidden = true;
      }
    }

    const r = w.ratings || {};
    const ringVals = {
      beauty:  r.beauty  || 0,
      power:   r.power   || 0,
      mystery: r.mystery || 0,
      wonder:  r.wonder  || 0,
    };
    Object.entries(ringVals).forEach(([key, val]) => {
      const ring = document.querySelector(`.w-ring[data-ring="${key}"]`);
      if (!ring) return;
      ring.dataset.value = val;
      const valueEl = ring.querySelector(`[data-ring-value="${key}"]`);
      if (valueEl) valueEl.textContent = '0';
    });

    const rankEl = document.querySelector('[data-wonderwall-rank]');
    if (rankEl) {
      rankEl.innerHTML =
        `Wonder Rating, ranked <span class="rank-num">#${w.wonderwallRank}</span> on the Wonderwall of <b>42</b>`;
    }
  }

  function renderNav(w) {
    const navPrev = document.querySelector('[data-nav-prev]');
    const navNext = document.querySelector('[data-nav-next]');
    if (!navPrev || !navNext) return;

    if (w.navigation?.previous) {
      navPrev.href = `../${w.navigation.previous}/index.html`;
      navPrev.classList.remove('w-foot__link--disabled');
      navPrev.querySelector('[data-nav-prev-title]').textContent = titleCase(w.navigation.previous);
    } else {
      navPrev.classList.add('w-foot__link--disabled');
      navPrev.querySelector('[data-nav-prev-title]').textContent = 'Series beginning';
    }

    if (w.navigation?.next) {
      navNext.href = `../${w.navigation.next}/index.html`;
      navNext.classList.remove('w-foot__link--disabled');
      navNext.querySelector('[data-nav-next-title]').textContent = titleCase(w.navigation.next);
    } else {
      navNext.classList.add('w-foot__link--disabled');
      navNext.querySelector('[data-nav-next-title]').textContent = 'More coming soon';
    }
  }

  async function init() {
    const slug = document.body.dataset.slug;
    if (!slug) return;
    try {
      const data = await loadData();
      const w = findWonder(data, slug);
      if (!w) return;

      renderHero(w);
      renderOverview(w);
      renderProse('[data-prose-intro]', w.prose?.intro, 2);
      renderHowToFind(w);
      renderKeyFacts(w);
      renderPullQuote(w);
      renderTiers(w);
      renderFinale(w);
      renderNav(w);

      document.dispatchEvent(new CustomEvent('wonder:hydrated'));
    } catch (err) {
      console.error('Failed to hydrate wonder page:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
