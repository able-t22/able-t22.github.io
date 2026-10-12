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

  function setMenu(open) {
    if (!menuToggle || !navLinks) return;
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuToggle.textContent = open ? '×' : '☰';

    if (open && motionAllowed() && hasGSAP() && matchMedia('(max-width: 680px)').matches) {
      gsap.fromTo($$('a', navLinks), { y: -8, opacity: 0 }, {
        y: 0, opacity: 1, duration: .28, stagger: .045, ease: 'power2.out', clearProps: 'transform,opacity', overwrite: true
      });
    }
  }

  menuToggle?.addEventListener('click', () => setMenu(!navLinks?.classList.contains('open')));
  $$('.nav-links a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks?.classList.contains('open')) {
      setMenu(false);
      menuToggle?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav')) setMenu(false);
  });
  matchMedia('(min-width: 681px)').addEventListener('change', () => setMenu(false));

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
  });

  // Keep the project gallery useful if a screenshot file is ever moved or removed.
  $$('img').forEach(img => {
    const markMissing = () => img.closest('.media-card, .project-visual, .preview-image')?.classList.add('image-missing');
    img.addEventListener('error', markMissing);
    if (img.complete && !img.naturalWidth) markMissing();
  });

  function setupSectionTracking() {
    sectionObserver?.disconnect();
    const links = $$('.nav-links a');
    const sections = $$('main section[id]');
    if (!('IntersectionObserver' in window) || !sections.length) return;

    sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id.includes('-details') ? 'projects' : entry.target.id;
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
      motionToggle.title = reducedMotion.matches ? 'Motion is disabled by your system preference' : 'Pause or resume animation effects';
      motionToggle.setAttribute('aria-label', motionAllowed() ? 'Pause animations' : reducedMotion.matches ? 'Animations disabled by system preference' : 'Resume animations');
      const icon = $('[aria-hidden="true"]', motionToggle);
      if (icon) icon.textContent = motionAllowed() ? 'Ⅱ' : '▷';
    }
    if (!motionAllowed()) return;

    if (!hasGSAP()) {
      // Native reveal fallback only; no content is hidden in the base stylesheet.
      if ('IntersectionObserver' in window) {
        fallbackObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.animate([
              { opacity: .35, transform: 'translateY(14px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
            fallbackObserver.unobserve(entry.target);
          });
        }, { threshold: .08 });
        $$('.reveal, .media-card, .skill-column, .achievement-card').forEach(el => fallbackObserver.observe(el));
      }
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    matchMediaAnimations = gsap.matchMedia();
    matchMediaAnimations.add({
      desktop: '(min-width: 1001px)',
      wide: '(min-width: 1200px) and (min-height: 760px)',
      finePointer: '(hover: hover) and (pointer: fine)',
      mobile: '(max-width: 680px)'
    }, context => {
      const { desktop, wide, finePointer, mobile } = context.conditions;
      const cleanups = [];
      const ease = 'power3.out';

      // Cinematic hero: staggered words, card entrance, and SVG stems that draw themselves.
      const heroIntro = gsap.timeline({ defaults: { ease, duration: desktop ? .82 : .62 } });
      heroIntro
        .fromTo('.hero .eyebrow', { y: 16, opacity: 0 }, { y: 0, opacity: 1 })
        .fromTo('.hero h1 .word', { yPercent: 115, opacity: 0, rotation: 1.5 }, {
          yPercent: 0, opacity: 1, rotation: 0, stagger: .065, duration: desktop ? .96 : .72, clearProps: 'transform,opacity'
        }, '-=.45')
        .fromTo('.hero-lede', { y: 18, opacity: 0, filter: 'blur(4px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .72, clearProps: 'filter,transform' }, '-=.47')
        .fromTo('.hero-actions .button', { y: 13, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, clearProps: 'transform,opacity' }, '-=.42')
        .fromTo('.hero-meta, .scroll-cue', { opacity: 0, y: 7 }, { opacity: 1, y: 0, stagger: .1, clearProps: 'transform,opacity' }, '-=.28')
        .fromTo('.system-card', { y: 30, x: 9, rotation: -5, scale: .97, opacity: 0 }, {
          y: 0, x: 0, rotation: -1.8, scale: 1, opacity: 1, duration: 1.05, clearProps: 'transform,opacity'
        }, .12)
        .fromTo('.system-grid > div', { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: .07, clearProps: 'transform,opacity' }, .62)
        .fromTo('.code-note', { y: 12, rotation: 9, opacity: 0 }, { y: 0, rotation: 4, opacity: 1, duration: .62, clearProps: 'transform,opacity' }, .74);

      // Draw the botanical accent and gently bring each flower petal into place.
      $$('.bloom-stem').forEach((path, index) => {
        try {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          heroIntro.to(path, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.out' }, .18 + index * .13);
        } catch { /* SVG drawing is decorative; continue if unsupported. */ }
      });
      heroIntro.fromTo('.flower .petal', { scale: .68, opacity: 0, transformOrigin: '50% 50%' }, {
        scale: 1, opacity: 1, stagger: .025, duration: .62, ease: 'back.out(1.5)', clearProps: 'transform,opacity'
      }, .6);

      // A short pinned project interlude on desktop; small screens keep natural scrolling.
      if (wide) {
        const workTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: '.work-intro',
            start: 'top top+=80',
            end: wide ? '+=88%' : '+=62%',
            pin: '.work-stage',
            pinSpacing: true,
            scrub: .65,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
        workTimeline
          .fromTo('.work-stage h2', { y: 42, scale: .88, transformOrigin: 'left center' }, { y: 0, scale: 1, ease: 'none' }, 0)
          .fromTo('.preview-resq', { xPercent: -9, rotation: -5, scale: .86, y: 22 }, { xPercent: 0, rotation: 0, scale: 1, y: 0, ease: 'none' }, 0)
          .fromTo('.preview-mini', { xPercent: 9, rotation: 5, scale: .86, y: 22 }, { xPercent: 0, rotation: 0, scale: 1, y: 0, ease: 'none' }, 0)
          .fromTo('.preview-image img', { scale: 1.12 }, { scale: 1, ease: 'none' }, 0);
      } else {
        $$('.work-preview').forEach((preview, index) => gsap.fromTo(preview, {
          y: 22, opacity: 0, rotation: index === 0 ? -2 : 2
        }, {
          y: 0, opacity: 1, rotation: 0, duration: .75, stagger: .08, ease,
          clearProps: 'transform,opacity', scrollTrigger: { trigger: preview, start: 'top 90%', once: true }
        }));
      }

      // Reveal regular content in viewport-sized batches to avoid a storm of scroll callbacks.
      const revealTargets = $$('.reveal').filter(el =>
        !el.closest('.hero') &&
        !el.matches('.project-card, .section-heading, .values-title, .timeline, .media-stack, .skill-column, .achievement-card, .detail-copy')
      );
      if (revealTargets.length) {
        gsap.set(revealTargets, { opacity: 0, y: desktop ? 22 : 14 });
        ScrollTrigger.batch(revealTargets, {
          start: 'top 93%',
          once: true,
          interval: .08,
          batchMax: desktop ? 5 : 3,
          onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: desktop ? .72 : .52, stagger: .07, ease, clearProps: 'opacity,transform' })
        });
      }

      // Scroll-reactive typography and rules create a quieter, editorial storytelling rhythm.
      $$('.scroll-title').forEach(title => {
        const words = $$('.word', title);
        gsap.fromTo(words, { opacity: .36, yPercent: 17 }, {
          opacity: 1, yPercent: 0, stagger: .035, ease: 'none',
          scrollTrigger: { trigger: title, start: 'top 88%', end: 'bottom 58%', scrub: .35 }
        });
      });
      $$('.section-line').forEach(line => gsap.fromTo(line, { scaleX: 0 }, {
        scaleX: 1, ease: 'none', scrollTrigger: { trigger: line.parentElement, start: 'top 92%', end: 'top 47%', scrub: .45 }
      }));

      // Project cards settle into the layout while their screenshots reveal through a mask.
      $$('.project-card').forEach((card, index) => {
        gsap.fromTo(card, { y: desktop ? 40 : 18, scale: desktop ? .965 : .99 }, {
          y: 0, scale: 1, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 92%', end: 'top 28%', scrub: .48 }
        });
        const image = $('.project-visual img', card);
        if (image) {
          gsap.fromTo(image, { clipPath: 'inset(0 0 100% 0 round 10px)', scale: 1.07 }, {
            clipPath: 'inset(0 0 0% 0 round 0px)', scale: 1, duration: 1.05, ease: 'power2.out',
            scrollTrigger: { trigger: image, start: 'top 82%', once: true }
          });
          gsap.to(image, { yPercent: desktop ? 3 : 1, ease: 'none', scrollTrigger: {
            trigger: $('.project-visual', card), start: 'top bottom', end: 'bottom top', scrub: .6
          }});
        }
        const bodyTargets = $$('.project-number, .project-kicker, h3, .project-subtitle, .tag-row, .project-actions', card);
        gsap.fromTo(bodyTargets, { x: desktop ? 20 : 8, opacity: 0 }, {
          x: 0, opacity: 1, duration: .62, stagger: .075, ease,
          clearProps: 'transform,opacity', scrollTrigger: { trigger: $('.project-body', card), start: 'top 84%', once: true }
        });
        gsap.fromTo($('.visual-tag', card), { scale: .75, opacity: 0, rotation: index % 2 ? 3 : -3 }, {
          scale: 1, opacity: 1, rotation: 0, duration: .55, ease: 'back.out(1.5)',
          clearProps: 'transform,opacity', scrollTrigger: { trigger: card, start: 'top 74%', once: true }
        });
      });

      // Case-study screenshots arrive in a staggered grid; images drift only while in the viewport.
      $$('.media-card').forEach((card, index) => {
        gsap.fromTo(card, { y: desktop ? 28 : 14, opacity: 0, scale: .985 }, {
          y: 0, opacity: 1, scale: 1, duration: .72, delay: (index % 2) * .04, ease,
          clearProps: 'transform,opacity', scrollTrigger: { trigger: card, start: 'top 92%', once: true }
        });
        const image = $('img', card);
        if (image) gsap.fromTo(image, { scale: 1.04 }, {
          scale: 1, duration: .9, ease: 'power2.out', clearProps: 'transform',
          scrollTrigger: { trigger: card, start: 'top 90%', once: true }
        });
      });

      $$('.feature-list > div').forEach(listItem => gsap.fromTo(listItem, { x: 12, opacity: 0 }, {
        x: 0, opacity: 1, duration: .52, ease, clearProps: 'transform,opacity',
        scrollTrigger: { trigger: listItem, start: 'top 92%', once: true }
      }));

      // Skill tiles use a restrained 3D entrance; their tags cascade in short, readable groups.
      $$('.skill-column').forEach((column, index) => {
        gsap.fromTo(column, { y: 30, opacity: 0, rotationX: desktop ? 5 : 0, scale: .98 }, {
          y: 0, opacity: 1, rotationX: 0, scale: 1, duration: .78, delay: desktop ? (index % 2) * .07 : 0,
          ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: column, start: 'top 90%', once: true }
        });
        gsap.fromTo($$('.skill-stack span', column), { y: 9, opacity: 0 }, {
          y: 0, opacity: 1, stagger: .035, duration: .42, ease, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: column, start: 'top 83%', once: true }
        });
      });

      gsap.fromTo('.timeline-rail', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: {
        trigger: '.timeline', start: 'top 76%', end: 'bottom 70%', scrub: .45
      }});
      $$('.edu-item').forEach(item => gsap.fromTo(item, { x: -18, opacity: 0 }, {
        x: 0, opacity: 1, duration: .7, ease, clearProps: 'transform,opacity',
        scrollTrigger: { trigger: item, start: 'top 88%', once: true }
      }));
      $$('.achievement-card').forEach((card, index) => gsap.fromTo(card, {
        y: 30, rotation: desktop ? (index - 1) * 1.5 : 0, opacity: 0, scale: .975
      }, {
        y: 0, rotation: 0, opacity: 1, scale: 1, duration: .78, delay: desktop ? index * .055 : 0,
        ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: card, start: 'top 89%', once: true }
      }));

      gsap.fromTo('.contact-inner', { y: 24, scale: desktop ? .975 : .99, opacity: .6 }, {
        y: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: {
          trigger: '.contact-section', start: 'top 94%', end: 'top 37%', scrub: .55
        }
      });
      gsap.fromTo('.contact-links a', { x: 18, opacity: 0 }, {
        x: 0, opacity: 1, stagger: .085, duration: .58, ease, clearProps: 'transform,opacity',
        scrollTrigger: { trigger: '.contact-links', start: 'top 85%', once: true }
      });

      // Two lightweight loops only, and only while their content is visible.
      const ticker = gsap.to('.ticker-track', { xPercent: -50, repeat: -1, duration: 40, ease: 'none', paused: true });
      const orbit = gsap.to('.orbit-outer', { rotation: 360, duration: 90, repeat: -1, ease: 'none', paused: true });
      const bloom = gsap.to('.flower-one', { rotation: 7, transformOrigin: '50% 50%', duration: 4.5, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true });
      let tickerVisible = false;
      let heroVisible = false;
      const syncLoops = () => {
        ticker.paused(document.hidden || !tickerVisible);
        orbit.paused(document.hidden || !heroVisible || !desktop);
        bloom.paused(document.hidden || !heroVisible);
      };
      let loopObserver = null;
      if ('IntersectionObserver' in window) {
        loopObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.target.matches('.ticker')) tickerVisible = entry.isIntersecting;
            if (entry.target.matches('.hero')) heroVisible = entry.isIntersecting;
          });
          syncLoops();
        });
        const tickerEl = $('.ticker');
        const heroEl = $('.hero');
        if (tickerEl) loopObserver.observe(tickerEl);
        if (heroEl) loopObserver.observe(heroEl);
      }
      document.addEventListener('visibilitychange', syncLoops);
      cleanups.push(() => {
        loopObserver?.disconnect();
        document.removeEventListener('visibilitychange', syncLoops);
      });

      // Gentle layered parallax adds depth to the hero and its illustration without scroll hijacking.
      if (desktop) {
        gsap.to('.hero-art', { y: -24, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .65
        }});
        gsap.to('.bloom-illustration', { y: 34, x: 7, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .7
        }});
      }

      // Pointer-only card tilt and magnetic buttons; no pointer listeners on touch devices.
      if (finePointer && !mobile) {
        $$('.media-card').forEach(card => {
          const rotateX = gsap.quickTo(card, 'rotationX', { duration: .32, ease: 'power2.out' });
          const rotateY = gsap.quickTo(card, 'rotationY', { duration: .32, ease: 'power2.out' });
          const z = gsap.quickTo(card, 'z', { duration: .32, ease: 'power2.out' });
          const onMove = event => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - .5;
            const py = (event.clientY - rect.top) / rect.height - .5;
            rotateX(-py * 3.2);
            rotateY(px * 3.2);
            z(4);
          };
          const reset = () => { rotateX(0); rotateY(0); z(0); };
          card.addEventListener('pointermove', onMove);
          card.addEventListener('pointerleave', reset);
          cleanups.push(() => {
            card.removeEventListener('pointermove', onMove);
            card.removeEventListener('pointerleave', reset);
          });
        });
        $$('.button').forEach(button => {
          const x = gsap.quickTo(button, 'x', { duration: .35, ease: 'power3.out' });
          const y = gsap.quickTo(button, 'y', { duration: .35, ease: 'power3.out' });
          let bounds = null;
          const onEnter = () => { bounds = button.getBoundingClientRect(); };
          const onMove = event => {
            if (!bounds) return;
            x((event.clientX - bounds.left - bounds.width / 2) * .1);
            y((event.clientY - bounds.top - bounds.height / 2) * .13);
          };
          const reset = () => { x(0); y(0); bounds = null; };
          button.addEventListener('pointerenter', onEnter);
          button.addEventListener('pointermove', onMove);
          button.addEventListener('pointerleave', reset);
          cleanups.push(() => {
            button.removeEventListener('pointerenter', onEnter);
            button.removeEventListener('pointermove', onMove);
            button.removeEventListener('pointerleave', reset);
          });
        });
      }

      return () => cleanups.forEach(cleanup => cleanup());
    });

    if (document.fonts?.ready) document.fonts.ready.then(() => {
      if (hasGSAP() && motionAllowed()) ScrollTrigger.refresh();
    });
  }

  motionToggle?.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    paused = !paused;
    storage.set('able-motion', paused ? 'paused' : 'enabled');
    setupMotion();
  });
  reducedMotion.addEventListener('change', setupMotion);
  setupMotion();

  window.addEventListener('load', () => {
    updateScrollUI();
    if (hasGSAP() && motionAllowed()) ScrollTrigger.refresh();
  }, { once: true });
})();
