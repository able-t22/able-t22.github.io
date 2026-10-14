/* Able Thomas portfolio — motion is progressive enhancement and respects reduced-motion settings. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const progress = $('#progress');
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  const motionToggle = $('#motionToggle');
  const backToTop = $('#backToTop');
  const pageWipe = $('#pageWipe');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } }
  };

  let paused = storage.get('able-motion') === 'paused';
  let matchMediaAnimations = null;
  let fallbackObserver = null;
  let scrollFrame = 0;
  let sectionObserver = null;

  const motionAllowed = () => !paused && !reducedMotion.matches;
  const hasGSAP = () => Boolean(window.gsap && window.ScrollTrigger);

  function updateScrollUI() {
    scrollFrame = 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const position = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    if (progress) progress.style.transform = `scaleX(${position})`;
    backToTop?.classList.toggle('show', window.scrollY > 520);
  }

  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  function setMenu(open, immediate = false) {
    if (!menuToggle || !navLinks) return;
    const mobile = matchMedia('(max-width: 680px)').matches;
    const wasOpen = navLinks.classList.contains('open');
    if (!open && wasOpen && !immediate && mobile && motionAllowed() && hasGSAP()) {
      navLinks.setAttribute('data-closing', 'true');
      const links = $$('a', navLinks);
      gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => {
        navLinks.classList.remove('open');
        navLinks.removeAttribute('data-closing');
        navLinks.style.removeProperty('clip-path');
        navLinks.setAttribute('aria-hidden', 'true');
      } })
        .to(links, { y: -10, opacity: 0, duration: .2, stagger: .025 }, 0)
        .to(navLinks, { clipPath: 'inset(0 0 100% 0)', duration: .3 }, .08);
    } else {
      navLinks.classList.toggle('open', open);
      navLinks.removeAttribute('data-closing');
      navLinks.style.removeProperty('clip-path');
      navLinks.setAttribute('aria-hidden', String(mobile && !open));
    }
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuToggle.textContent = open ? '×' : '☰';

    if (open && motionAllowed() && hasGSAP() && mobile) {
      const links = $$('a', navLinks);
      gsap.killTweensOf([navLinks, ...links]);
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(navLinks, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .46, ease: 'power3.inOut' })
        .fromTo(links, { y: 26, opacity: 0, rotationX: -5, transformOrigin: 'left center' }, {
          y: 0, opacity: 1, rotationX: 0, duration: .42, stagger: .065, clearProps: 'transform,opacity', ease: 'power3.out'
        }, '-=.18');
    }
  }

  menuToggle?.addEventListener('click', () => setMenu(!navLinks?.classList.contains('open')));
  $$('.nav-links a').forEach(link => link.addEventListener('click', () => setMenu(false, true)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks?.classList.contains('open')) {
      setMenu(false);
      menuToggle?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav')) setMenu(false);
  });
  matchMedia('(min-width: 681px)').addEventListener('change', () => setMenu(false, true));

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
  });

  // Keep every project visual intentional if a local image is unavailable.
  $$('img').forEach(img => {
    const markMissing = () => {
      const container = img.closest('.media-image, .project-visual, .preview-image');
      if (!container || container.dataset.fallbackBuilt === 'true') return;
      container.dataset.fallbackBuilt = 'true';
      container.classList.add('image-missing');
      img.hidden = true;
      const fallback = document.createElement('div');
      fallback.className = 'image-fallback';
      const label = (img.alt || '').replace(/^(ResQ|MiniPlay)\s*/i, '').trim();
      fallback.innerHTML = '<span class="image-fallback__mark" aria-hidden="true">AT</span><span class="image-fallback__eyebrow">PROJECT PREVIEW</span><strong></strong><span class="image-fallback__note">The local preview image could not be loaded.</span>';
      fallback.querySelector('strong').textContent = label || 'Project preview';
      container.append(fallback);
    };
    img.addEventListener('error', markMissing);
    if (img.complete && !img.naturalWidth) markMissing();
  });

  function setupSectionTracking() {
    sectionObserver?.disconnect();
    const links = $$('.nav-links a');
    const sections = $('.hero, main section[id]');
    if (!('IntersectionObserver' in window) || !sections.length) return;

    sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.matches('.hero') ? 'top' : entry.target.id.includes('-details') ? 'projects' : entry.target.id;
        links.forEach(link => {
          const active = link.hash === `#${id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-16% 0px -68% 0px', threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
  }
  setupSectionTracking();

  // Split words into clipping windows for the editorial, line-by-line feel. Text remains semantic.
  function splitWords(element) {
    if (!element || element.dataset.wordsSplit === 'true') return;
    const walk = parent => {
      [...parent.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (!text || !text.trim()) return;
          const fragment = document.createDocumentFragment();
          text.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.append(document.createTextNode(part));
              return;
            }
            const clip = document.createElement('span');
            clip.className = 'word-clip';
            const word = document.createElement('span');
            word.className = 'word';
            word.textContent = part;
            clip.append(word);
            fragment.append(clip);
          });
          node.replaceWith(fragment);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR' && !node.classList.contains('word-clip')) {
          walk(node);
        }
      });
    };
    walk(element);
    element.dataset.wordsSplit = 'true';
  }

  splitWords($('.hero h1'));
  const wordTitleSelector = '.section-heading h2, .section-content .display, .values-title, .contact-inner h2, .detail-copy h2';
  $$(wordTitleSelector).forEach(title => {
    title.classList.add('scroll-title');
    splitWords(title);
  });

  $$('.section').forEach(section => {
    if ($('.section-line', section)) return;
    const line = document.createElement('div');
    line.className = 'section-line';
    line.setAttribute('aria-hidden', 'true');
    section.prepend(line);
  });

  function setupMotion() {
    matchMediaAnimations?.revert();
    matchMediaAnimations = null;
    fallbackObserver?.disconnect();
    fallbackObserver = null;
    document.body.classList.toggle('motion-paused', !motionAllowed());
    if (motionToggle) {
      motionToggle.setAttribute('aria-pressed', String(!motionAllowed()));
      motionToggle.disabled = reducedMotion.matches;
      motionToggle.setAttribute('aria-label', motionAllowed() ? 'Pause animations' : 'Resume animations');
      $('[aria-hidden]', motionToggle).textContent = motionAllowed() ? 'Ⅱ' : '▷';
    }
    if (!motionAllowed() || !hasGSAP()) return;
    gsap.registerPlugin(ScrollTrigger);
    matchMediaAnimations = gsap.matchMedia();
    matchMediaAnimations.add({ desktop: '(min-width: 1001px)', fine: '(hover: hover) and (pointer: fine)', mobile: '(max-width: 680px)' }, context => {
      const { desktop, fine, mobile } = context.conditions;
      const cleanups = [];
      const ease = 'power3.out';
      // Each moving layer owns its transform: entrance, scroll and pointer never compete.
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.hero .eyebrow', { y: 18, autoAlpha: 0, duration: .7 }, .08)
        .from('.hero h1 .word', { yPercent: 115, rotation: 5, duration: 1.25, stagger: .12 }, .2)
        .from('.hero-lede, .hero-actions, .hero-socials, .hero-meta', { y: 24, opacity: 0, duration: .85, stagger: .1, clearProps: 'transform,opacity' }, .6)
        .fromTo('.portrait-frame', { clipPath: 'inset(100% 0 0 0)', opacity: 0 }, { clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 1.5, clearProps: 'clipPath,opacity' }, .22)
        .from('.portrait-chip, .hero-art-index, .hero-art-note, .scroll-cue', { y: 20, opacity: 0, duration: .8, stagger: .08, clearProps: 'transform,opacity' }, 1);

      $$('.scroll-title').forEach(title => {
        gsap.fromTo($$('.word', title), { yPercent: 100, rotation: 3 }, {
          yPercent: 0, rotation: 0, stagger: .045, duration: .95, ease: 'power4.out',
          scrollTrigger: { trigger: title, start: 'top 91%', once: true }
        });
      });
      const reveals = $$('.reveal').filter(el => !el.closest('.hero') && !el.matches('.project-card, .media-stack, .timeline, .achievement-card, .section-heading'));
      ScrollTrigger.batch(reveals, { start: 'top 94%', once: true, onEnter: batch => gsap.fromTo(batch, { y: 26, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .8, ease, clearProps: 'transform,opacity' }) });
      $$('.section-line').forEach(line => gsap.from(line, { scaleX: 0, transformOrigin: 'left', ease: 'none', scrollTrigger: { trigger: line, start: 'top 95%', end: 'top 50%', scrub: .7 } }));

      if (desktop) {
        gsap.to('.hero-copy', { y: -85, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
        gsap.to('.hero-art', { y: 65, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
        const film = gsap.timeline({ scrollTrigger: { trigger: '.motion-film', start: 'top 86px', end: '+=1200', pin: '.film-stage', scrub: 1, anticipatePin: 1 }, defaults: { ease: 'none' } });
        film.fromTo('.film-orbit', { scale: .7, rotation: -35, xPercent: 15 }, { scale: 1.12, rotation: 30, xPercent: -4, duration: 2 }, 0)
          .to('.orbit-axis--one', { rotationX: 210, rotationY: 60, rotationZ: 120, duration: 2 }, 0)
          .to('.orbit-axis--two', { rotationY: -140, rotationX: 60, rotationZ: -90, duration: 2 }, 0)
          .to('.orbit-axis--three', { rotationY: 200, rotationZ: 150, duration: 2 }, 0)
          .fromTo('.film-copy', { x: -35, opacity: .35 }, { x: 0, opacity: 1, duration: .6 }, 0)
          .to('.film-copy', { y: -30, duration: 1.4 }, .6)
          .to('.film-meter i', { scaleX: 1, duration: 2 }, 0);
      } else {
        gsap.to('.film-orbit', { rotation: 65, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.motion-film', start: 'top bottom', end: 'bottom top', scrub: 1 } });
        gsap.to('.film-meter i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.motion-film', start: 'top 75%', end: 'bottom 50%', scrub: .5 } });
      }
      $$('.project-card').forEach(card => {
        const visual = $('.project-visual', card);
        const image = $('img', visual);
        gsap.fromTo(visual, { clipPath: 'inset(12% 6% 12% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
        gsap.fromTo(image, { scale: 1.13 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: .8 } });
        gsap.fromTo($$('.project-number, .project-kicker, h3, .project-subtitle, .project-body p:not(.project-subtitle), .tag-row, .project-actions', card), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .07, ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: $('.project-body',card), start: 'top 93%', once: true } });
      });
      ScrollTrigger.batch($$('.skill-logo-card'), { start: 'top 96%', once: true, batchMax: mobile ? 4 : 10, onEnter: batch => gsap.fromTo(batch, { y: 32, rotationX: -35, opacity: 0, transformPerspective: 800 }, { y: 0, rotationX: 0, opacity: 1, stagger: .055, duration: .85, ease, clearProps: 'transform,opacity' }) });
      $$('.media-card, .edu-item, .achievement-card').forEach(card => gsap.fromTo(card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: card, start: 'top 95%', once: true } }));
      gsap.from('.timeline-rail', { scaleY: 0, transformOrigin: 'top', ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 75%', end: 'bottom 65%', scrub: .6 } });
      gsap.from('.contact-links a', { x: 35, opacity: 0, stagger: .13, duration: .9, ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.contact-links', start: 'top 92%', once: true } });
      if (fine && !mobile) {
        $$('.project-card, .skill-logo-card, .achievement-card').forEach(card => {
          const move = event => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width * 100) + '%');
            card.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height * 100) + '%');
          };
          card.addEventListener('pointermove', move);
          cleanups.push(() => card.removeEventListener('pointermove', move));
        });
        $$('.button, .nav-cta').forEach(button => {
          const x = gsap.quickTo(button, 'x', { duration: .45, ease });
          const y = gsap.quickTo(button, 'y', { duration: .45, ease });
          let bounds;
          const enter = () => { bounds = button.getBoundingClientRect(); };
          const move = event => { if (bounds) { x((event.clientX - bounds.left - bounds.width / 2) * .15); y((event.clientY - bounds.top - bounds.height / 2) * .2); } };
          const leave = () => { x(0); y(0); bounds = null; };
          button.addEventListener('pointerenter', enter); button.addEventListener('pointermove', move); button.addEventListener('pointerleave', leave);
          cleanups.push(() => { button.removeEventListener('pointerenter', enter); button.removeEventListener('pointermove', move); button.removeEventListener('pointerleave', leave); });
        });
      }
      return () => cleanups.forEach(cleanup => cleanup());
    });
    document.fonts?.ready.then(() => { if (hasGSAP()) ScrollTrigger.refresh(); });
  }

  let isNavigating = false;
  let navigationTimeline = null;
  let finishNavigation = null;
  function setupAnchorTransitions() {
    if (!pageWipe) return;
    const shutters = $$('.shutter', pageWipe);
    const identity = $('.page-wipe__identity', pageWipe);
    const name = $('.page-wipe__name', pageWipe);
    const index = $('.transition-index', pageWipe);
    const corner = $('.transition-corner', pageWipe);
    const chapters = { top: ['Introduction', '01'], about: ['Behind the craft', '04'], projects: ['Selected work', '03'], skills: ['The toolkit', '02'], education: ['Always learning', '05'], contact: ['Let’s create.', '06'], 'resq-details': ['ResQ', '03.1'], 'miniplay-details': ['MiniPlay', '03.2'] };
    document.addEventListener('click', event => {
      const link = event.target.closest('.nav-links a[href^="#"], .brand[href^="#"], .nav-cta[href^="#"], .hero-actions a[href^="#"], .project-actions a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      let target;
      try { target = $(hash); } catch { return; }
      if (!target || !hasGSAP() || !motionAllowed()) return;
      event.preventDefault();
      if (isNavigating) return;
      const destination = () => target.id === 'top' ? 0 : Math.max(0, window.scrollY + target.getBoundingClientRect().top - $('.site-header').offsetHeight - 16);
      if (Math.abs(window.scrollY - destination()) < 30) return;
      isNavigating = true;
      document.body.classList.add('is-transitioning');
      const chapter = chapters[target.id] || ['A new perspective', '01'];
      name.textContent = chapter[0]; index.textContent = 'CHAPTER / ' + chapter[1];
      setMenu(false, true);
      const navigate = () => {
        window.scrollTo({ top: destination(), behavior: 'instant' });
        ScrollTrigger.update();
        if (location.hash !== hash) history.pushState(null, '', hash);
        target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
      };
      let relocated = false;
      finishNavigation = () => {
        if (!relocated) { navigate(); relocated = true; }
        gsap.set(pageWipe, { autoAlpha: 0 });
        document.body.classList.remove('is-transitioning');
        isNavigating = false; navigationTimeline = null; finishNavigation = null;
      };
      gsap.set(pageWipe, { autoAlpha: 1 });
      gsap.set(shutters, { y: 0, yPercent: i => i === 0 ? -101 : 101 });
      gsap.set(identity, { autoAlpha: 1 });
      gsap.set(name, { yPercent: 115 });
      gsap.set('.transition-meta, .transition-index', { opacity: 0 });
      gsap.set('.transition-rule', { scaleX: 0 });
      navigationTimeline = gsap.timeline({ onComplete: finishNavigation, defaults: { ease: 'power4.inOut' } })
        .to(shutters, { yPercent: 0, duration: .65, stagger: .025 }, 0)
        .to(name, { yPercent: 0, duration: .75, ease: 'power4.out' }, .4)
        .to('.transition-meta, .transition-index', { opacity: 1, duration: .3, stagger: .08 }, .55)
        .to('.transition-rule', { scaleX: 1, duration: .55 }, .55)
        .to(corner, { opacity: 1, duration: .3 }, .55)
        .add(() => { navigate(); relocated = true; }, .72)
        .to(identity, { autoAlpha: 0, duration: .25 }, 1.12)
        .to(corner, { opacity: 0, duration: .2 }, 1.12)
        .to(shutters, { yPercent: i => i === 0 ? -101 : 101, duration: .8, stagger: .035 }, 1.22);
    });
    const cancel = () => { if (navigationTimeline) { navigationTimeline.kill(); finishNavigation?.(); } };
    reducedMotion.addEventListener('change', cancel);
    motionToggle?.addEventListener('click', cancel);
    window.addEventListener('pagehide', cancel);
  }

  // The custom cursor and spotlight are restricted to the hero artwork. They are
  // disabled on touch devices, for reduced-motion users, or while motion is paused.
  let cursorCleanup = null;
  function setupHeroCursor() {
    cursorCleanup?.();
    cursorCleanup = null;
    const heroArt = $('.hero-art');
    const portraitFrame = $('#heroPortraitFrame');
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    const label = $('#cursorLabel');
    if (!heroArt || !portraitFrame || !dot || !ring || !label || !motionAllowed() || !matchMedia('(hover: hover) and (pointer: fine)').matches) {
      heroArt?.classList.remove('cursor-active');
      return;
    }

    const backplate = $('.portrait-frame__backplate', heroArt);
    const focusChip = $('.portrait-chip--focus', heroArt);
    const scoreChip = $('.portrait-chip--score', heroArt);
    let dotX, dotY, ringX, ringY, rotateX, rotateY;
    let backX, backY, focusX, focusY, scoreX, scoreY;
    if (hasGSAP()) {
      dotX = gsap.quickTo(dot, 'x', { duration: .1, ease: 'power3.out' });
      dotY = gsap.quickTo(dot, 'y', { duration: .1, ease: 'power3.out' });
      ringX = gsap.quickTo(ring, 'x', { duration: .22, ease: 'power3.out' });
      ringY = gsap.quickTo(ring, 'y', { duration: .22, ease: 'power3.out' });
      rotateX = gsap.quickTo(portraitFrame, 'rotationX', { duration: .36, ease: 'power3.out' });
      rotateY = gsap.quickTo(portraitFrame, 'rotationY', { duration: .36, ease: 'power3.out' });
      if (backplate) { backX = gsap.quickTo(backplate, 'x', { duration: .42, ease: 'power3.out' }); backY = gsap.quickTo(backplate, 'y', { duration: .42, ease: 'power3.out' }); }
      if (focusChip) { focusX = gsap.quickTo(focusChip, 'x', { duration: .34, ease: 'power3.out' }); focusY = gsap.quickTo(focusChip, 'y', { duration: .34, ease: 'power3.out' }); }
      if (scoreChip) { scoreX = gsap.quickTo(scoreChip, 'x', { duration: .38, ease: 'power3.out' }); scoreY = gsap.quickTo(scoreChip, 'y', { duration: .38, ease: 'power3.out' }); }
    }
    const moveCursor = event => {
      if (hasGSAP()) {
        dotX(event.clientX); dotY(event.clientY); ringX(event.clientX); ringY(event.clientY);
      } else {
        for (const node of [dot, ring]) {
          node.style.left = `${event.clientX}px`;
          node.style.top = `${event.clientY}px`;
        }
      }
    };
    const moveHero = event => {
      const rect = heroArt.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - .5;
      const py = (event.clientY - rect.top) / rect.height - .5;
      heroArt.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`);
      heroArt.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`);
      const photoRect = portraitFrame.getBoundingClientRect();
      portraitFrame.style.setProperty('--photo-x', `${event.clientX - photoRect.left}px`);
      portraitFrame.style.setProperty('--photo-y', `${event.clientY - photoRect.top}px`);
      if (hasGSAP()) {
        rotateX(-py * 5.2); rotateY(px * 6.4);
        backX?.(-px * 13); backY?.(-py * 15);
        focusX?.(px * 7); focusY?.(py * 9);
        scoreX?.(-px * 9); scoreY?.(-py * 11);
      } else if (event.target.closest('#heroPortraitFrame')) {
        portraitFrame.style.transform = `perspective(1000px) rotateZ(-3.6deg) rotateX(${-py * 5.2}deg) rotateY(${px * 6.4}deg)`;
      }
      label.textContent = event.target.closest('#heroPortraitFrame') ? 'EXPLORE' : 'MOVE';
      ring.classList.toggle('is-over-portrait', Boolean(event.target.closest('#heroPortraitFrame')));
    };
    const enterHero = event => {
      heroArt.classList.add('cursor-active');
      document.body.classList.add('hero-cursor-active');
      moveCursor(event);
      moveHero(event);
    };
    const onPointerMove = event => { moveCursor(event); moveHero(event); };
    const leaveHero = () => {
      heroArt.classList.remove('cursor-active');
      document.body.classList.remove('hero-cursor-active');
      ring.classList.remove('is-over-portrait');
      label.textContent = 'MOVE';
      if (hasGSAP()) {
        rotateX(0); rotateY(0);
        backX?.(0); backY?.(0); focusX?.(0); focusY?.(0); scoreX?.(0); scoreY?.(0);
      } else {
        portraitFrame.style.transform = 'rotate(-3.6deg)';
      }
      portraitFrame.style.removeProperty('--photo-x');
      portraitFrame.style.removeProperty('--photo-y');
    };
    heroArt.addEventListener('pointerenter', enterHero);
    heroArt.addEventListener('pointermove', onPointerMove);
    heroArt.addEventListener('pointerleave', leaveHero);
    cursorCleanup = () => {
      heroArt.removeEventListener('pointerenter', enterHero);
      heroArt.removeEventListener('pointermove', onPointerMove);
      heroArt.removeEventListener('pointerleave', leaveHero);
      heroArt.classList.remove('cursor-active');
      document.body.classList.remove('hero-cursor-active');
      document.body.classList.remove('hero-cursor-active');
      ring.classList.remove('is-over-portrait');
      heroArt.style.removeProperty('--spotlight-x');
      heroArt.style.removeProperty('--spotlight-y');
      if (hasGSAP()) { gsap.set([dot, ring, portraitFrame, backplate, focusChip, scoreChip].filter(Boolean), { clearProps: 'transform' }); }
    };
  }

  motionToggle?.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    paused = !paused;
    storage.set('able-motion', paused ? 'paused' : 'enabled');
    setupMotion();
    setupHeroCursor();
  });
  reducedMotion.addEventListener('change', () => { setupMotion(); setupHeroCursor(); });
  setupMotion();
  setupHeroCursor();
  setupAnchorTransitions();

  window.addEventListener('load', () => {
    updateScrollUI();
    if (hasGSAP() && motionAllowed()) ScrollTrigger.refresh();
  }, { once: true });
})();
