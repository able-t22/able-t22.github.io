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

      // Cinematic hero: staggered words and a clean portrait-card entrance.
      const heroIntro = gsap.timeline({ defaults: { ease, duration: desktop ? .82 : .62 } });
      heroIntro
        .fromTo('.hero .eyebrow', { y: 16, opacity: 0 }, { y: 0, opacity: 1 })
        .fromTo('.hero h1 .word', { yPercent: 115, opacity: 0, rotation: 1.5 }, {
          yPercent: 0, opacity: 1, rotation: 0, stagger: .065, duration: desktop ? .96 : .72, clearProps: 'transform,opacity'
        }, '-=.45')
        .fromTo('.hero-lede', { y: 18, opacity: 0, filter: 'blur(4px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .72, clearProps: 'filter,transform' }, '-=.47')
        .fromTo('.hero-actions .button', { y: 13, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, clearProps: 'transform,opacity' }, '-=.42')
        .fromTo('.hero-meta, .scroll-cue', { opacity: 0, y: 7 }, { opacity: 1, y: 0, stagger: .1, clearProps: 'transform,opacity' }, '-=.28')
        .fromTo('.portrait-frame', { y: 34, rotation: 2.8, scale: .93, opacity: 0, clipPath: 'inset(0 0 100% 0 round 25px)' }, {
          y: 0, rotation: -3.6, scale: 1, opacity: 1, clipPath: 'inset(0 0 0% 0 round 25px)', duration: 1.18, clearProps: 'clipPath,opacity'
        }, .12)
        .fromTo('.portrait-frame__backplate', { x: 10, y: 10, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .72, clearProps: 'opacity,transform' }, .22)
        .fromTo('.portrait-chip--focus', { x: -12, y: 8, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .6, clearProps: 'opacity,transform' }, .48)
        .fromTo('.portrait-chip--score', { x: 12, y: 10, opacity: 0, scale: .96 }, { x: 0, y: 0, opacity: 1, scale: 1, duration: .62, clearProps: 'opacity,transform' }, .6)
        ;

      // Keep the portrait treatment clean; there are no decorative flower overlays.

      // The main project cards now follow the skills row directly; no pinned interlude is needed.

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
          gsap.to(image, { yPercent: desktop ? -5 : -2, ease: 'none', scrollTrigger: {
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
        if (image) gsap.fromTo(image, {
          scale: 1.1, y: 12, clipPath: 'inset(11% 5% 11% 5% round 11px)'
        }, {
          scale: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.05,
          ease: 'power3.out', clearProps: 'transform,clipPath',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true }
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

      // Two lightweight loops only; pause them whenever their section is off-screen.
      const ticker = gsap.to('.ticker-track', { xPercent: -50, repeat: -1, duration: 40, ease: 'none', paused: true });
      const portraitDrift = gsap.to('.portrait-frame', { y: -4, duration: 4.6, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true });
      let tickerVisible = false;
      let heroVisible = false;
      const syncLoops = () => {
        ticker.paused(document.hidden || !tickerVisible);
        portraitDrift.paused(document.hidden || !heroVisible || !desktop);
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

      // Layered scroll choreography: the copy eases away while portrait layers move at
      // different rates. Everything is scrubbed to scroll position; nothing hijacks scroll.
      if (desktop) {
        gsap.to('.hero-art', { y: -24, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .65
        }});
        gsap.to('.hero-copy', { yPercent: -11, autoAlpha: .18, filter: 'blur(4px)', ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .7
        }});
        gsap.to('.portrait-frame', { yPercent: 9, rotation: 1.2, scale: .94, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8
        }});
        gsap.to('.portrait-frame__backplate', { xPercent: 3, yPercent: 8, rotation: 12, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .85
        }});
        gsap.to('.portrait-chip--focus', { xPercent: -2, yPercent: -8, rotation: -7, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .75
        }});
        gsap.to('.portrait-chip--score', { xPercent: 2, yPercent: 10, rotation: 6, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8
        }});
        gsap.to('.hero-art-note--left', { x: -24, y: -18, rotation: -18, autoAlpha: .35, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .75
        }});
        gsap.to('.hero-art-note--right', { x: 18, y: 22, autoAlpha: .35, ease: 'none', scrollTrigger: {
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .75
        }});
        gsap.to('.skills-logo-strip', { x: 18, ease: 'none', scrollTrigger: {
          trigger: '#skills', start: 'top bottom', end: 'top 35%', scrub: .7
        }});
      }

      // Skill icon tiles enter as a staggered 3D field instead of simply appearing.
      const skillTiles = $$('.skill-logo-card');
      if (skillTiles.length) {
        gsap.fromTo(skillTiles, {
          y: desktop ? 34 : 18, opacity: 0, rotationX: desktop ? 11 : 0,
          rotationY: desktop ? (index => index % 2 ? 7 : -7) : 0, scale: .94, filter: 'blur(3px)',
          transformPerspective: 900, transformOrigin: 'center bottom'
        }, {
          y: 0, opacity: 1, rotationX: 0, rotationY: 0, scale: 1, filter: 'blur(0px)',
          duration: desktop ? .78 : .55, stagger: desktop ? .035 : .018, ease: 'power3.out',
          clearProps: 'transform,opacity,filter', scrollTrigger: {
            trigger: '#skills', start: 'top 76%', once: true
          }
        });
      }

      // Project cards subtly rotate into a level plane as the section arrives.
      $$('.project-card').forEach((card, index) => {
        gsap.fromTo(card, {
          rotation: desktop ? (index % 2 ? 1.15 : -1.15) : 0,
          transformPerspective: 1100, transformOrigin: 'center center'
        }, {
          rotation: 0, ease: 'none', scrollTrigger: {
            trigger: card, start: 'top 92%', end: 'top 32%', scrub: .65
          }
        });
      });

      // Pointer-only card tilt, live glass highlights and magnetic buttons; no listeners on touch devices.
      if (finePointer && !mobile) {
        // Reusable low-amplitude 3D tilt for project panels and skill tiles.
        const attachTilt = (element, intensity = 4, depth = 5) => {
          const rotateX = gsap.quickTo(element, 'rotationX', { duration: .28, ease: 'power3.out' });
          const rotateY = gsap.quickTo(element, 'rotationY', { duration: .28, ease: 'power3.out' });
          const z = gsap.quickTo(element, 'z', { duration: .28, ease: 'power3.out' });
          const onMove = event => {
            const rect = element.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / Math.max(rect.width, 1);
            const ny = (event.clientY - rect.top) / Math.max(rect.height, 1);
            rotateX((.5 - ny) * intensity * 2);
            rotateY((nx - .5) * intensity * 2);
            z(depth);
            element.style.setProperty('--pointer-x', `${nx * 100}%`);
            element.style.setProperty('--pointer-y', `${ny * 100}%`);
          };
          const reset = () => {
            rotateX(0); rotateY(0); z(0);
            element.style.setProperty('--pointer-x', '50%');
            element.style.setProperty('--pointer-y', '50%');
          };
          element.addEventListener('pointermove', onMove);
          element.addEventListener('pointerleave', reset);
          cleanups.push(() => {
            element.removeEventListener('pointermove', onMove);
            element.removeEventListener('pointerleave', reset);
            element.style.removeProperty('--pointer-x');
            element.style.removeProperty('--pointer-y');
            gsap.set(element, { clearProps: 'rotationX,rotationY,z' });
          });
        };
        $$('.project-card').forEach(card => attachTilt(card, 2.1, 7));
        $$('.skill-logo-card').forEach(card => {
          card.classList.add('gsap-tilting');
          attachTilt(card, 5.5, 7);
          cleanups.push(() => card.classList.remove('gsap-tilting'));
        });

        $$('.media-card').forEach(card => {
          const rotateX = gsap.quickTo(card, 'rotationX', { duration: .32, ease: 'power2.out' });
          const rotateY = gsap.quickTo(card, 'rotationY', { duration: .32, ease: 'power2.out' });
          const z = gsap.quickTo(card, 'z', { duration: .32, ease: 'power2.out' });
          const onMove = event => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - .5;
            const py = (event.clientY - rect.top) / rect.height - .5;
            rotateX(-py * 4.4);
            rotateY(px * 4.4);
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

  // Only primary navigation clicks trigger this full-screen transition. Regular scrolling
  // and all in-page CTA links retain their normal, un-interrupted behaviour.
  let isNavigating = false;
  function setupAnchorTransitions() {
    if (!pageWipe) return;
    const panels = $$('.page-wipe__panel', pageWipe);
    const identity = $('.page-wipe__identity', pageWipe);
    document.addEventListener('click', event => {
      const link = event.target.closest('.nav-links a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      let target;
      try { target = $(hash); } catch { target = null; }
      if (!target) return;
      if (!hasGSAP() || !motionAllowed()) return;
      if (isNavigating) { event.preventDefault(); return; }

      event.preventDefault();
      isNavigating = true;
      document.body.classList.add('is-transitioning');
      if (navLinks?.classList.contains('open')) setMenu(false, true);
      gsap.killTweensOf([pageWipe, ...panels, identity]);
      gsap.set(pageWipe, { autoAlpha: 1 });
      gsap.set(panels, { xPercent: index => index === 0 ? -105 : 105 });
      gsap.set(identity, { autoAlpha: 0, y: 18 });

      gsap.timeline({ defaults: { ease: 'power4.inOut' }, onComplete: () => {
        pageWipe.style.visibility = 'hidden';
        document.body.classList.remove('is-transitioning');
        isNavigating = false;
        gsap.set(identity, { clearProps: 'all' });
        if (hasGSAP()) ScrollTrigger.refresh();
      } })
        .to(panels, { xPercent: 0, duration: .3, stagger: .025 }, 0)
        .to(identity, { autoAlpha: 1, y: 0, duration: .2, ease: 'power2.out' }, .18)
        .add(() => {
          const offset = target.id === 'top' ? 0 : Math.max(0, window.scrollY + target.getBoundingClientRect().top - 82);
          window.scrollTo({ top: offset, behavior: 'auto' });
          if (location.hash !== hash) history.pushState(null, '', hash);
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }, .36)
        .to(identity, { autoAlpha: 0, y: -4, duration: .12, ease: 'power1.in' }, .54)
        .to(panels, { xPercent: index => index === 0 ? -105 : 105, duration: .34, stagger: .025 }, .56)
        .set(pageWipe, { autoAlpha: 0 }, '+=.01');
    });
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
