// Golden stardust cursor trail. Spawns small glowing particles along the
// pointer path that fade and drift downward. Disabled on touch / reduced motion.

(function () {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none)').matches) return;

  const container = document.querySelector('.stardust-container') || (() => {
    const el = document.createElement('div');
    el.className = 'stardust-container';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  })();

  let lastX = 0;
  let lastY = 0;
  let throttled = false;
  const MIN_MOVE = 4;
  const MAX_PARTICLES = 140;
  let live = 0;

  function spawn(x, y) {
    if (live >= MAX_PARTICLES) return;
    const p = document.createElement('span');
    p.className = 'stardust';
    const size = 4 + Math.random() * 6;
    const drift = (Math.random() - 0.5) * 52;
    const fall = 14 + Math.random() * 30;
    const rot = (Math.random() - 0.5) * 120;
    const life = 700 + Math.random() * 500;
    p.style.cssText =
      `left:${x}px;top:${y}px;` +
      `width:${size}px;height:${size}px;` +
      `--drift:${drift}px;--fall:${fall}px;--rot:${rot}deg;` +
      `animation-duration:${life}ms;`;
    container.appendChild(p);
    live++;
    setTimeout(() => {
      p.remove();
      live--;
    }, life);
  }

  document.addEventListener('mousemove', (e) => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < MIN_MOVE) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (throttled) return;
    throttled = true;
    requestAnimationFrame(() => { throttled = false; });

    // Spawn 1-3 particles per move, slightly offset
    const count = Math.min(3, 1 + Math.floor(dist / 14));
    for (let i = 0; i < count; i++) {
      spawn(e.clientX + (Math.random() - 0.5) * 10, e.clientY + (Math.random() - 0.5) * 10);
    }
  }, { passive: true });

  // Stronger burst on click
  document.addEventListener('click', (e) => {
    for (let i = 0; i < 10; i++) {
      spawn(e.clientX + (Math.random() - 0.5) * 24, e.clientY + (Math.random() - 0.5) * 24);
    }
  });
})();
