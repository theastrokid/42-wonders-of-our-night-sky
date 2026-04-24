// Wonder page interactions: hero play + immersive fade, overview count-ups,
// finale radial rings, how-to-find + wall clip video behaviour, tier comparator,
// left-rail scroll-spy + progress fill, reveal-on-scroll.

(function () {
  'use strict';

  // Hero: click-to-play (lazy-attaches heavy video src on first click).
  // When playback starts, fade out copy + buttons after a short idle.
  // Any mouse movement inside the hero re-reveals them but restarts the idle timer.
  function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const video = hero.querySelector('video');
    const playBtn = hero.querySelector('[data-hero-play]');
    const unmuteBtn = hero.querySelector('[data-hero-unmute]');
    if (!video) return;

    const IDLE_MS = 2500;

    const scheduleImmersive = () => {
      clearTimeout(hero._immersiveTimer);
      hero._immersiveTimer = setTimeout(() => {
        if (hero.classList.contains('is-playing')) hero.classList.add('is-immersive');
      }, IDLE_MS);
    };
    const exitImmersive = () => {
      hero.classList.remove('is-immersive');
      clearTimeout(hero._immersiveTimer);
    };

    playBtn?.addEventListener('click', () => {
      const isPlaying = hero.classList.contains('is-playing');
      if (!isPlaying) {
        if (!video.src && video.dataset.deferredSrc) {
          video.src = video.dataset.deferredSrc;
        }
        video.muted = false;
        video.currentTime = 0;
        video.play().then(() => {
          hero.classList.add('is-playing');
          scheduleImmersive();
        });
        playBtn.querySelector('.label').textContent = 'Pause';
      } else {
        video.pause();
        hero.classList.remove('is-playing');
        exitImmersive();
        playBtn.querySelector('.label').textContent = 'Play with sound';
      }
    });

    unmuteBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      unmuteBtn.querySelector('.label').textContent = video.muted ? 'Unmute' : 'Mute';
    });

    video.addEventListener('ended', () => {
      hero.classList.remove('is-playing');
      exitImmersive();
      if (playBtn) playBtn.querySelector('.label').textContent = 'Play with sound';
      document.getElementById('s-what')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Reveal on mousemove while playing, re-arm the idle timer.
    hero.addEventListener('mousemove', () => {
      if (!hero.classList.contains('is-playing')) return;
      hero.classList.remove('is-immersive');
      scheduleImmersive();
    });

    // Mouseleave: go immersive almost immediately
    hero.addEventListener('mouseleave', () => {
      if (!hero.classList.contains('is-playing')) return;
      clearTimeout(hero._immersiveTimer);
      hero._immersiveTimer = setTimeout(() => {
        if (hero.classList.contains('is-playing')) hero.classList.add('is-immersive');
      }, 400);
    });
  }

  function countUp(el, target, duration) {
    const start = performance.now();
    // Ease-out quart to match the bar's cubic-bezier(0.16, 1, 0.3, 1)
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Overview ratings: fade + bar + count-up sequentially L to R, but only once
  // the strip is scrolled into view (not at hydration time, so the user sees
  // the animation happen rather than finding a static strip at the top).
  function initOverviewRatings() {
    const strip = document.querySelector('.w-overview');
    if (!strip) return;
    const valueCells = strip.querySelectorAll('[data-rating-value]');
    const ratingCells = [...strip.querySelectorAll('.w-rating')];
    if (!valueCells.length) return;

    const STAGGER = 110;
    const axisOrder = { beauty: 0, power: 1, mystery: 2, wonder: 3 };

    const play = () => {
      ratingCells.forEach((cell, i) => {
        setTimeout(() => cell.classList.add('is-loaded'), i * STAGGER);
      });
      valueCells.forEach((valueEl, idx) => {
        const target = Number(valueEl.dataset.ratingTarget || 0);
        const key = valueEl.getAttribute('data-rating-value');
        const barEl = strip.querySelector(`[data-rating-bar="${key}"]`);
        const delay = 80 + (axisOrder[key] ?? idx) * STAGGER;
        setTimeout(() => {
          if (barEl) barEl.style.width = target + '%';
          countUp(valueEl, target, 4500);
        }, delay);
      });
    };

    const io = new IntersectionObserver(
      (entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            play();
            o.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -80px 0px' }
    );
    io.observe(strip);
  }

  function initFinaleRings() {
    const rings = document.querySelectorAll('.w-ring');
    if (!rings.length) return;

    const animateRing = (ring) => {
      const target = Number(ring.dataset.value || 0);
      const arc = ring.querySelector('.w-ring__arc');
      const valueEl = ring.querySelector('.w-ring__value');
      const circle = arc;
      const r = Number(circle?.getAttribute('r') || 52);
      const circ = 2 * Math.PI * r;
      if (arc) {
        arc.style.setProperty('--circ', circ);
        arc.style.strokeDasharray = circ;
        arc.style.strokeDashoffset = circ;
        requestAnimationFrame(() => {
          arc.style.strokeDashoffset = circ * (1 - Math.max(0, Math.min(100, target)) / 100);
        });
      }
      if (valueEl) {
        const dur = ring.matches('.w-ring--wonder') ? 2400 : 1800;
        countUp(valueEl, target, dur);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            animateRing(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    rings.forEach((r) => io.observe(r));
  }

  // How-to-find clip: loop natively, start at offset, 2x rate. Pause offscreen.
  function initHowToFind() {
    const video = document.querySelector('[data-howfind-video]');
    if (!video) return;
    const startAt = Number(video.dataset.startAt || 0);
    const rate = Number(video.dataset.playbackRate || 1);
    video.loop = false;
    if (rate && rate !== 1) video.playbackRate = rate;

    const seekToStart = () => { try { video.currentTime = startAt || 0; } catch (e) {} };
    if (video.readyState >= 3) { if (startAt) seekToStart(); video.playbackRate = rate || 1; }
    else video.addEventListener('canplay', () => { if (startAt) seekToStart(); video.playbackRate = rate || 1; }, { once: true });

    video.addEventListener('ended', () => {
      seekToStart();
      if (rate) video.playbackRate = rate;
      video.play().catch(() => setTimeout(() => video.play().catch(() => {}), 120));
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (rate && video.playbackRate !== rate) video.playbackRate = rate;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.3 }
    );
    io.observe(video);
  }

  // Wall-placement clip in the finale: autoplay muted, native loop, pause offscreen.
  function initWallClip() {
    const video = document.querySelector('[data-wall-video]');
    if (!video) return;
    const startAt = Number(video.dataset.startAt || 0);
    const rate = Number(video.dataset.playbackRate || 1);
    video.loop = true;
    if (rate && rate !== 1) video.playbackRate = rate;

    const seekToStart = () => { try { video.currentTime = startAt || 0; } catch (e) {} };
    if (startAt) {
      if (video.readyState >= 3) seekToStart();
      else video.addEventListener('canplay', seekToStart, { once: true });
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(video);
  }

  // Tier comparator: click tabs to switch image + caption + tech.
  // Arrow keys left/right cycle tiers. Progress dots reflect active tier.
  // On first scroll-into-view we auto-cycle through the tiers with a 2s hold
  // per step, stopping as soon as the user hovers / focuses / clicks inside.
  function initCompare() {
    const mount = document.querySelector('[data-compare-mount]');
    if (!mount) return;
    const tiers = mount._tiers || {};
    const tabs = mount.querySelectorAll('.w-compare__tab');
    const imgs = mount.querySelectorAll('.w-compare__img');
    const dots = mount.querySelectorAll('.w-compare__progress-dot');
    const caption = mount.querySelector('[data-compare-caption]');
    const tech = mount.querySelector('[data-compare-tech]');
    const badgePrice = mount.querySelector('[data-compare-badge-price]');
    const badgeDevice = mount.querySelector('[data-compare-badge-device]');
    if (!tabs.length) return;

    const priceLabel = { '500': '$500', '1m': '$1,000,000', '1b': '$1,000,000,000' };

    const activate = (tier) => {
      tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tier === tier));
      imgs.forEach((i) => i.classList.toggle('is-active', i.dataset.tier === tier));
      dots.forEach((d) => d.classList.toggle('is-active', d.dataset.tier === tier));
      const data = tiers[tier];
      if (caption) {
        caption.style.opacity = '0';
        setTimeout(() => {
          caption.textContent = data?.caption || '';
          caption.style.opacity = '1';
        }, 160);
      }
      if (tech) tech.textContent = data?.tech || '';
      if (badgePrice) badgePrice.textContent = priceLabel[tier] || '';
      if (badgeDevice) badgeDevice.textContent = data?.device || '';
    };

    const order = [...tabs].map((t) => t.dataset.tier);

    // Auto-cycle state (declared first so click handlers can refer to them)
    let autoTimer = null;
    let autoIdx = 0;
    let hasStarted = false;
    let hovering = false;
    let userLocked = false;  // once user clicks / uses arrow keys, stop auto-cycle permanently
    const HOLD_MS = 2000;
    const stage = mount.querySelector('.w-compare__stage');

    function stepAuto() {
      if (hovering || userLocked) return;
      autoIdx = (autoIdx + 1) % order.length;
      activate(order[autoIdx]);
      autoTimer = setTimeout(stepAuto, HOLD_MS);
    }

    function pauseCycle() {
      hovering = true;
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    function resumeCycle() {
      hovering = false;
      if (!hasStarted || autoTimer || userLocked) return;
      autoTimer = setTimeout(stepAuto, HOLD_MS);
    }

    function lockUserChoice() {
      userLocked = true;
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      lockUserChoice();
      activate(tab.dataset.tier);
      autoIdx = order.indexOf(tab.dataset.tier);
    }));

    mount.addEventListener('keydown', (e) => {
      const activeIdx = order.indexOf(mount.querySelector('.w-compare__tab.is-active')?.dataset.tier);
      if (e.key === 'ArrowRight' && activeIdx >= 0) {
        e.preventDefault();
        lockUserChoice();
        const next = (activeIdx + 1) % order.length;
        activate(order[next]); autoIdx = next;
      } else if (e.key === 'ArrowLeft' && activeIdx >= 0) {
        e.preventDefault();
        lockUserChoice();
        const prev = (activeIdx - 1 + order.length) % order.length;
        activate(order[prev]); autoIdx = prev;
      }
    });

    mount.addEventListener('mouseenter', pauseCycle);
    mount.addEventListener('mouseleave', resumeCycle);
    mount.addEventListener('focusin', pauseCycle);
    mount.addEventListener('focusout', (e) => {
      if (!mount.contains(e.relatedTarget)) resumeCycle();
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !hasStarted) {
            hasStarted = true;
            if (!hovering) autoTimer = setTimeout(stepAuto, HOLD_MS / 4);
          }
        }
      },
      // Generous rootMargin so cycling starts well before the stage is fully
      // visible, giving the user a sense that it's alive as they approach.
      { threshold: 0, rootMargin: '0px 0px 300px 0px' }
    );
    if (stage) io.observe(stage);
  }

  // Typewriter effect for any [data-typewriter] element (finale quote, rank, etc.)
  // with a subtle gold stardust burst along the bounding box as it types.
  function initRankTypewriter() {
    const els = document.querySelectorAll('[data-typewriter]');
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            runTypewriter(e.target);
            o.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  function runTypewriter(el) {
    const fullHtml = el.innerHTML;
    // Tokenise into plain text + html tag boundaries so HTML stays intact while we reveal characters.
    const tokens = [];
    let i = 0;
    while (i < fullHtml.length) {
      if (fullHtml[i] === '<') {
        const end = fullHtml.indexOf('>', i);
        if (end === -1) { tokens.push({ type: 'text', v: fullHtml.slice(i) }); break; }
        tokens.push({ type: 'tag', v: fullHtml.slice(i, end + 1) });
        i = end + 1;
      } else {
        tokens.push({ type: 'text', v: fullHtml[i] });
        i++;
      }
    }

    el.textContent = '';
    el.classList.add('is-typing');

    const stardust = document.querySelector('.stardust-container');

    let idx = 0;
    let current = '';
    const CHAR_MS = 14;

    const sprinkle = (rect) => {
      if (!stardust || !rect) return;
      // Spawn 1-2 particles at a random point along the element each char
      const x = rect.left + Math.random() * rect.width;
      const y = rect.top + Math.random() * rect.height;
      for (let k = 0; k < 2; k++) {
        const p = document.createElement('span');
        p.className = 'stardust';
        const size = 4 + Math.random() * 5;
        const drift = (Math.random() - 0.5) * 40;
        const fall = 14 + Math.random() * 22;
        const rot = (Math.random() - 0.5) * 120;
        const life = 900 + Math.random() * 500;
        p.style.cssText =
          `left:${x + (Math.random() - 0.5) * 8}px;top:${y + (Math.random() - 0.5) * 8}px;` +
          `width:${size}px;height:${size}px;` +
          `--drift:${drift}px;--fall:${fall}px;--rot:${rot}deg;` +
          `animation-duration:${life}ms;`;
        stardust.appendChild(p);
        setTimeout(() => p.remove(), life);
      }
    };

    function tick() {
      if (idx >= tokens.length) {
        el.classList.remove('is-typing');
        return;
      }
      const tok = tokens[idx++];
      current += tok.v;
      el.innerHTML = current;
      if (tok.type === 'text' && tok.v.trim()) sprinkle(el.getBoundingClientRect());
      setTimeout(tick, CHAR_MS);
    }
    setTimeout(tick, 120);
  }

  // Scroll index: drop a class on the rail once the user leaves the hero
  function initScrollIndexHeroClass() {
    const rail = document.querySelector('.w-scroll-index');
    const hero = document.querySelector('.w-hero');
    if (!rail || !hero) return;
    const check = () => {
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      rail.classList.toggle('is-past-hero', window.scrollY >= heroBottom - 80);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // Left-rail scroll spy: highlight active section, fill vertical progress bar.
  // Flashes the section labels for 2 s whenever the active section changes.
  function initScrollIndex() {
    const index = document.querySelector('.w-scroll-index');
    if (!index) return;
    const fillEl = index.querySelector('[data-scroll-fill]');
    const items = [...index.querySelectorAll('li')];
    const links = items.map((li) => li.querySelector('a'));
    const targets = links.map((a) => document.querySelector(a.getAttribute('href')));

    // Smooth scroll on click
    links.forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    let raf;
    let currentIdx = -1;

    const update = () => {
      raf = null;
      const scrollTop = window.scrollY;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = Math.max(0, Math.min(1, scrollable ? scrollTop / scrollable : 0));
      if (fillEl) fillEl.style.height = (pct * 100) + '%';

      const midY = scrollTop + window.innerHeight * 0.3;
      let activeIdx = 0;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (!t) continue;
        if (t.offsetTop <= midY) activeIdx = i;
      }
      if (activeIdx !== currentIdx) {
        items.forEach((li, i) => li.classList.toggle('is-active', i === activeIdx));
        currentIdx = activeIdx;
      }
    };

    window.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  }

  function initAll() {
    initHero();
    initOverviewRatings();
    initFinaleRings();
    initHowToFind();
    initWallClip();
    initCompare();
    initScrollIndex();
    initScrollIndexHeroClass();
    initRankTypewriter();
    initReveal();
  }

  document.addEventListener('wonder:hydrated', initAll);
  document.addEventListener('DOMContentLoaded', initReveal);
})();
