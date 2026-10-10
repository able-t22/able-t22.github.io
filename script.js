/* Progressive enhancement: the portfolio stays readable without GSAP or a network. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const progress = $('#progress');
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  const themeToggle = $('#themeToggle');
  const motionToggle = $('#motionToggle');
  const backToTop = $('#backToTop');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private browsing. */ } }
  };
  let paused = storage.get('able-motion') === 'paused';
  let media;
  let fallbackObserver;
  const fallbackAnimations = new Set();
  let scrollFrame = 0;
  const motionAllowed = () => !paused && !reduced.matches;

  function updateScrollUI() {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0) + ')';
    backToTop.classList.toggle('show', scrollY > 500);
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  const hasGSAP = () => Boolean(window.gsap && window.ScrollTrigger);
  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuToggle.textContent = open ? '×' : '☰';
    if (open && motionAllowed() && hasGSAP()) {
      gsap.fromTo(navLinks.querySelectorAll('a'), { y: -8, opacity: 0 }, {
        y: 0, opacity: 1, duration: .3, stagger: .04, clearProps: 'transform,opacity', overwrite: true
      });
    }
  }
  menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav')) setMenu(false);
  });
  matchMedia('(min-width: 761px)').addEventListener('change', () => setMenu(false));

  function applyTheme(theme) {
    const light = theme === 'light';
    document.body.classList.toggle('light', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    themeToggle.querySelector('.theme-icon').textContent = light ? '☀' : '☾';
    themeToggle.querySelector('.theme-label').textContent = light ? 'Light' : 'Dark';
    themeToggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    $('meta[name="theme-color"]').content = light ? '#f3f2eb' : '#101211';
    storage.set('able-theme', theme);
  }
  applyTheme(storage.get('able-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  themeToggle.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
    if (motionAllowed() && hasGSAP()) gsap.fromTo('.theme-icon', { rotation: -60, scale: .6 }, {
      rotation: 0, scale: 1, duration: .4, ease: 'back.out(1.5)', clearProps: 'transform', overwrite: true
    });
  });
  backToTop.addEventListener('click', () => scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'instant' }));

  $$('img').forEach(img => {
    const missing = () => {
      const card = img.closest('.media-card,.project-visual');
      card?.classList.add('image-missing');
      // Keep meaningful alternative text visible when an asset is unavailable.
    };
    img.addEventListener('error', missing);
    if (img.complete && !img.naturalWidth) missing();
  });

  // Track the section nearest the header, including the two project case studies.
  const navItems = [...navLinks.querySelectorAll('a')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id.includes('-details') ? 'projects' : entry.target.id;
      navItems.forEach(link => {
        const active = link.hash === '#' + id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  $$('main section[id]').forEach(section => sectionObserver.observe(section));

  const heading = $('.hero h1');
  // Preserve the heading's text structure; wrap words rather than hundreds of characters.
  const wrapWords = element => {
    [...element.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(word => {
          if (!word.trim()) fragment.append(document.createTextNode(word));
          else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word;
            fragment.append(span);
          }
        });
        node.replaceWith(fragment);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') wrapWords(node);
    });
  };
  wrapWords(heading);

  function setupMotion() {
    media?.revert();
    fallbackObserver?.disconnect();
    fallbackAnimations.forEach(animation => animation.cancel());
    fallbackAnimations.clear();
    document.body.classList.toggle('motion-paused', !motionAllowed());
    motionToggle.setAttribute('aria-pressed', String(!motionAllowed()));
    motionToggle.disabled = reduced.matches;
    motionToggle.title = reduced.matches ? 'Motion follows your system reduced-motion preference' : 'Toggle animation effects';
    motionToggle.setAttribute('aria-label', motionAllowed() ? 'Pause animations' : reduced.matches ? 'Animations disabled by system preference' : 'Enable animations');
    motionToggle.querySelector('[aria-hidden]').textContent = motionAllowed() ? 'Ⅱ' : '▷';
    if (!motionAllowed()) return;

    if (!hasGSAP()) {
      // CDN failure should never hide content or disable navigation.
      fallbackObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const animation = entry.target.animate([{ opacity: .3, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
        fallbackAnimations.add(animation);
        animation.onfinish = () => fallbackAnimations.delete(animation);
        fallbackObserver.unobserve(entry.target);
      }), { threshold: .08 });
      $$('.reveal').forEach(el => fallbackObserver.observe(el));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({ desktop: '(min-width: 1001px)', fine: '(hover: hover) and (pointer: fine)', mobile: '(max-width: 1000px)' }, context => {
      const { desktop, fine } = context.conditions;
      const cleanup = [];
      const duration = desktop ? .85 : .55;
      const heroIntro = gsap.timeline({ defaults: { ease: 'power3.out', duration } });
      heroIntro.from('.hero .eyebrow', { y: 14, opacity: 0 })
        .from('.hero h1 .word', { yPercent: 70, opacity: 0, rotation: 2, stagger: .075 }, '-=.6')
        .from('.hero-lede', { y: 20, opacity: 0 }, '-=.55')
        .from('.hero-actions .button', { y: 16, opacity: 0, stagger: .1 }, '-=.55')
        .from('.hero-meta, .scroll-cue', { opacity: 0, y: 8, stagger: .1 }, '-=.4')
        .from('.system-card', { y: 35, rotation: -3, opacity: 0, duration: 1.1 }, .25)
        .from('.system-grid > div', { y: 10, opacity: 0, stagger: .08 }, .7);

      // Large containers stay visible; individual cards reveal at their own viewport position.
      const revealTargets = $$('.reveal').filter(el => !el.closest('.hero') && !el.matches('.media-stack, .timeline'));
      revealTargets.push(...$$('.media-card, .edu-item'));
      gsap.set(revealTargets, { opacity: 0, y: desktop ? 30 : 18 });
      ScrollTrigger.batch(revealTargets, {
        start: 'top 94%', once: true, interval: .08, batchMax: desktop ? 4 : 2,
        onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration, stagger: .085, ease: 'power3.out', clearProps: 'opacity,transform' })
      });
      $$('.feature-list, .skill-stack, .contact-links').forEach(group => {
        gsap.from(group.children, { y: 12, opacity: 0, stagger: .055, duration: .55, ease: 'power2.out',
          scrollTrigger: { trigger: group, start: 'top 93%', once: true } });
      });
      $$('.mini-stats strong').forEach(el => {
        const original = el.textContent;
        if (!/^\d+(\.\d+)?$/.test(original)) return;
        const value = { n: 0 };
        const places = original.includes('.') ? original.split('.')[1].length : 0;
        el.setAttribute('aria-label', original);
        gsap.to(value, { n: Number(original), duration: 1.4, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => { el.textContent = value.n.toFixed(places); },
          onComplete: () => { el.textContent = original; }
        });
        cleanup.push(() => { el.textContent = original; });
      });

      // Only two ambient loops; both stop offscreen and in background tabs.
      const ticker = gsap.to('.ticker-track', { xPercent: -50, repeat: -1, duration: 38, ease: 'none', paused: true });
      const orbit = gsap.to('.orbit-outer', { rotation: 360, duration: 65, repeat: -1, ease: 'none', paused: true });
      let tickerVisible = false;
      let heroVisible = false;
      const syncLoops = () => {
        ticker.paused(document.hidden || !tickerVisible);
        orbit.paused(document.hidden || !heroVisible || !desktop);
      };
      const loopObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target.matches('.ticker')) tickerVisible = entry.isIntersecting;
          else heroVisible = entry.isIntersecting;
        });
        syncLoops();
      });
      loopObserver.observe($('.ticker'));
      loopObserver.observe($('.hero'));
      document.addEventListener('visibilitychange', syncLoops);
      cleanup.push(() => { loopObserver.disconnect(); document.removeEventListener('visibilitychange', syncLoops); });

      if (desktop) {
        gsap.to('.hero-art', { y: -32, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
        $$('.project-visual img').forEach(img => gsap.fromTo(img, { scale: 1.07, yPercent: -2 }, {
          scale: 1, yPercent: 2, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: .6 }
        }));
      }
      if (fine) {
        const listen = (el, type, fn) => { el.addEventListener(type, fn); cleanup.push(() => el.removeEventListener(type, fn)); };
        // Reuse tweens instead of allocating a new animation for each pointer event.
        $$('.button').forEach(button => {
          const x = gsap.quickTo(button, 'x', { duration: .35, ease: 'power3.out' });
          const y = gsap.quickTo(button, 'y', { duration: .35, ease: 'power3.out' });
          let bounds;
          listen(button, 'pointerenter', () => { bounds = button.getBoundingClientRect(); });
          listen(button, 'pointermove', event => {
            if (!bounds) return;
            x((event.clientX - bounds.left - bounds.width / 2) * .12);
            y((event.clientY - bounds.top - bounds.height / 2) * .18);
          });
          listen(button, 'pointerleave', () => { x(0); y(0); bounds = null; });
        });
        $$('.contact-links a').forEach(link => {
          const x = gsap.quickTo(link.lastElementChild, 'x', { duration: .3 });
          const y = gsap.quickTo(link.lastElementChild, 'y', { duration: .3 });
          listen(link, 'pointerenter', () => { x(5); y(-5); });
          listen(link, 'pointerleave', () => { x(0); y(0); });
          listen(link, 'focus', () => { x(5); y(-5); });
          listen(link, 'blur', () => { x(0); y(0); });
        });
      }
      return () => cleanup.forEach(fn => fn());
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }
  motionToggle.addEventListener('click', () => {
    if (reduced.matches) return;
    paused = !paused;
    storage.set('able-motion', paused ? 'paused' : 'enabled');
    setupMotion();
  });
  reduced.addEventListener('change', setupMotion);
  setupMotion();
  addEventListener('load', () => { updateScrollUI(); if (hasGSAP()) ScrollTrigger.refresh(); }, { once: true });
})();
