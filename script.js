(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const cursorDot = $("#cursorDot");
  const cursorRing = $("#cursorRing");
  const cursorLabel = $("#cursorLabel");
  const portraitFrame = $("#heroPortraitFrame");
  const progress = $("#progress");
  const pageWipe = $("#pageWipe");
  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  const motionToggle = $("#motionToggle");
  const backToTop = $("#backToTop");

  let motionPaused = false;
  let transitionRunning = false;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;
  let cursorFrame = 0;
  let lastScrollY = window.scrollY;

  const gsapAvailable = typeof window.gsap !== "undefined";
  const scrollTriggerAvailable =
    gsapAvailable && typeof window.ScrollTrigger !== "undefined";

  if (gsapAvailable && scrollTriggerAvailable) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // --------------------------------------------------
  // ACCESSIBILITY AND MOTION CONTROL
  // --------------------------------------------------

  function setMotionState(paused) {
    motionPaused = paused;

    if (gsapAvailable) {
      if (paused) {
        gsap.globalTimeline.pause();
        if (scrollTriggerAvailable) {
          ScrollTrigger.getAll().forEach((trigger) => {
            trigger.disable(false, false);
          });
        }
      } else {
        gsap.globalTimeline.resume();

        if (scrollTriggerAvailable) {
          ScrollTrigger.getAll().forEach((trigger) => {
            trigger.enable(false, false);
          });

          ScrollTrigger.refresh();
        }
      }
    }

    document.body.classList.toggle("motion-paused", paused);

    if (motionToggle) {
      motionToggle.setAttribute("aria-pressed", String(paused));
      motionToggle.setAttribute(
        "aria-label",
        paused ? "Resume animations" : "Pause animations"
      );

      const icon = $("span:first-child", motionToggle);

      if (icon) {
        icon.textContent = paused ? "▶" : "Ⅱ";
      }
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      setMotionState(!motionPaused);
    });
  }

  if (reducedMotion.matches) {
    document.body.classList.add("reduced-motion");
  }

  reducedMotion.addEventListener?.("change", (event) => {
    document.body.classList.toggle("reduced-motion", event.matches);

    if (event.matches && gsapAvailable) {
      gsap.globalTimeline.progress(1);
    }
  });

  // --------------------------------------------------
  // MOBILE NAVIGATION
  // --------------------------------------------------

  function closeMobileMenu() {
    if (!menuToggle || !navLinks) return;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navLinks.classList.remove("open");
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Open navigation" : "Close navigation"
      );

      navLinks.classList.toggle("open", !isOpen);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    });
  }

  // --------------------------------------------------
  // CUSTOM CURSOR
  // --------------------------------------------------

  function startCursor() {
    if (!finePointer.matches || reducedMotion.matches) return;
    if (!cursorDot || !cursorRing) return;

    document.body.classList.add("hero-cursor-active");

    document.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;

        gsap.set(cursorDot, {
          x: pointerX,
          y: pointerY
        });

        if (!cursorFrame) {
          cursorFrame = requestAnimationFrame(updateCursor);
        }
      },
      { passive: true }
    );

    function updateCursor() {
      cursorX += (pointerX - cursorX) * 0.18;
      cursorY += (pointerY - cursorY) * 0.18;

      gsap.set(cursorRing, {
        x: cursorX,
        y: cursorY
      });

      if (
        Math.abs(pointerX - cursorX) > 0.2 ||
        Math.abs(pointerY - cursorY) > 0.2
      ) {
        cursorFrame = requestAnimationFrame(updateCursor);
      } else {
        cursorFrame = 0;
      }
    }

    const interactiveElements = $$(
      "a, button, [data-cursor-label], .project-card, .media-card"
    );

    interactiveElements.forEach((element) => {
      element.addEventListener("pointerenter", () => {
        if (cursorRing) {
          cursorRing.classList.add("is-over-portrait");
        }

        if (cursorLabel) {
          cursorLabel.textContent =
            element.dataset.cursorLabel ||
            (element.matches("a, button") ? "OPEN" : "VIEW");
        }
      });

      element.addEventListener("pointerleave", () => {
        if (cursorRing) {
          cursorRing.classList.remove("is-over-portrait");
        }

        if (cursorLabel) {
          cursorLabel.textContent = "MOVE";
        }
      });
    });

    document.addEventListener("pointerleave", () => {
      document.body.classList.remove("hero-cursor-active");
    });

    document.addEventListener("pointerenter", () => {
      document.body.classList.add("hero-cursor-active");
    });
  }

  // --------------------------------------------------
  // PORTRAIT TILT
  // --------------------------------------------------

  function startPortraitTilt() {
    if (!portraitFrame || !finePointer.matches || reducedMotion.matches) {
      return;
    }

    portraitFrame.addEventListener("pointermove", (event) => {
      if (motionPaused || transitionRunning) return;

      const bounds = portraitFrame.getBoundingClientRect();

      const relativeX =
        (event.clientX - bounds.left) / bounds.width - 0.5;

      const relativeY =
        (event.clientY - bounds.top) / bounds.height - 0.5;

      const rotateY = relativeX * 5;
      const rotateX = relativeY * -5;

      if (gsapAvailable) {
        gsap.to(portraitFrame, {
          rotateX,
          rotateY,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto"
        });
      } else {
        portraitFrame.style.transform =
          `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    });

    portraitFrame.addEventListener("pointerleave", () => {
      if (gsapAvailable) {
        gsap.to(portraitFrame, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.65,
          ease: "power3.out"
        });
      } else {
        portraitFrame.style.transform = "";
      }
    });
  }

  // --------------------------------------------------
  // NAVIGATION-CLICK-ONLY PAGE TRANSITION
  // --------------------------------------------------

  function findDestination(link) {
    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#")) return null;

    return $(href);
  }

  function animateNavigationTransition(link, destination) {
    if (!pageWipe || !gsapAvailable || reducedMotion.matches) {
      closeMobileMenu();

      if (destination) {
        destination.scrollIntoView({ behavior: "auto" });
      }

      return;
    }

    if (transitionRunning) return;

    transitionRunning = true;

    const panels = $$(".page-wipe__panel", pageWipe);
    const identity = $(".page-wipe__identity", pageWipe);

    if (panels.length < 2 || !identity) {
      transitionRunning = false;
      closeMobileMenu();

      if (destination) {
        destination.scrollIntoView({ behavior: "auto" });
      }

      return;
    }

    closeMobileMenu();

    document.body.classList.add("is-transitioning");

    pageWipe.style.visibility = "visible";
    pageWipe.style.pointerEvents = "auto";

    gsap.set(pageWipe, {
      autoAlpha: 1
    });

    gsap.set(panels, {
      yPercent: 100
    });

    gsap.set(identity, {
      autoAlpha: 0
    });

    const timeline = gsap.timeline({
      defaults: {
        ease: "power3.inOut"
      },
      onComplete: () => {
        pageWipe.style.visibility = "hidden";
        pageWipe.style.pointerEvents = "none";

        document.body.classList.remove("is-transitioning");

        gsap.set(panels, {
          clearProps: "transform"
        });

        gsap.set(identity, {
          clearProps: "all"
        });

        transitionRunning = false;

        if (scrollTriggerAvailable) {
          ScrollTrigger.refresh();
        }
      }
    });

    timeline
      .to(panels[0], {
        yPercent: 0,
        duration: 0.35
      })
      .to(
        panels[1],
        {
          yPercent: 0,
          duration: 0.35
        },
        "-=0.25"
      )
      .to(identity, {
        autoAlpha: 1,
        duration: 0.18
      })
      .add(() => {
        if (destination) {
          window.scrollTo({
            top:
              destination.getBoundingClientRect().top +
              window.scrollY -
              ($(".site-header")?.offsetHeight || 0),
            behavior: "instant"
          });
        }
      })
      .to(identity, {
        autoAlpha: 0,
        duration: 0.16,
        delay: 0.08
      })
      .to(panels[0], {
        yPercent: -100,
        duration: 0.35
      })
      .to(
        panels[1],
        {
          yPercent: -100,
          duration: 0.35
        },
        "-=0.25"
      );
  }

  function setupNavigationTransitions() {
    const navLinksOnly = $$(".nav-links a[href^='#']");

    navLinksOnly.forEach((link) => {
      link.addEventListener("click", (event) => {
        const destination = findDestination(link);

        if (!destination) return;

        event.preventDefault();

        if (transitionRunning) return;

        history.pushState(null, "", link.getAttribute("href"));

        animateNavigationTransition(link, destination);
      });
    });
  }

  // --------------------------------------------------
  // SCROLL PROGRESS AND BACK-TO-TOP
  // --------------------------------------------------

  function updateScrollUI() {
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    const percentage =
      maxScroll > 0 ? window.scrollY / maxScroll : 0;

    if (progress) {
      progress.style.transform = `scaleX(${percentage})`;
    }

    if (backToTop) {
      backToTop.classList.toggle("show", window.scrollY > 500);
    }

    lastScrollY = window.scrollY;
  }

  window.addEventListener("scroll", updateScrollUI, {
    passive: true
  });

  updateScrollUI();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion.matches ? "auto" : "smooth"
      });
    });
  }

  // --------------------------------------------------
  // ACTIVE NAVIGATION LINK
  // --------------------------------------------------

  function setupActiveNavigation() {
    if (!scrollTriggerAvailable || reducedMotion.matches) return;

    const sections = $$("#about, #skills, #projects, #education, #contact");

    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top 35%",
        end: "bottom 35%",
        onToggle: (self) => {
          if (!self.isActive) return;

          const matchingLink = $(
            `.nav-links a[href="#${section.id}"]`
          );

          $$(".nav-links a").forEach((link) => {
            link.classList.remove("active");
          });

          matchingLink?.classList.add("active");
        }
      });
    });
  }

  // --------------------------------------------------
  // GSAP ANIMATIONS
  // --------------------------------------------------

  function setupAnimations() {
    if (!gsapAvailable) {
      $$(".reveal").forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });

      return;
    }

    if (reducedMotion.matches) {
      gsap.set(".reveal", {
        clearProps: "all"
      });

      return;
    }

    gsap.defaults({
      ease: "power3.out",
      duration: 0.9
    });

    // Hero entrance
    const heroTimeline = gsap.timeline({
      delay: 0.1
    });

    heroTimeline
      .from(".eyebrow", {
        y: 15,
        opacity: 0,
        duration: 0.6
      })
      .from(
        ".hero h1",
        {
          y: 45,
          opacity: 0,
          rotateX: -12,
          transformOrigin: "50% 100%",
          duration: 1
        },
        "-=0.3"
      )
      .from(
        ".hero-lede",
        {
          y: 20,
          opacity: 0,
          duration: 0.7
        },
        "-=0.5"
      )
      .from(
        ".hero-actions .button",
        {
          y: 14,
          opacity: 0,
          stagger: 0.12,
          duration: 0.5
        },
        "-=0.4"
      )
      .from(
        ".hero-art",
        {
          y: 35,
          opacity: 0,
          scale: 0.97,
          duration: 1.15
        },
        "-=0.9"
      )
      .from(
        ".portrait-chip",
        {
          y: 15,
          opacity: 0,
          stagger: 0.12,
          duration: 0.55
        },
        "-=0.45"
      );

    // Reveal sections as they enter the viewport
    $$(".reveal").forEach((element) => {
      if (
        element.closest(".hero") ||
        element.classList.contains("hero-copy") ||
        element.classList.contains("hero-art")
      ) {
        return;
      }

      const delay = Number(element.dataset.delay || 0) / 1000;

      gsap.from(element, {
        y: 32,
        opacity: 0,
        duration: 0.85,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true
        }
      });
    });

    // Stagger the cards without animating them on every scroll
    [".project-card", ".skill-column", ".achievement-card", ".media-card"]
      .forEach((selector) => {
        $$(selector).forEach((element, index) => {
          gsap.from(element, {
            y: 25,
            opacity: 0,
            duration: 0.65,
            delay: (index % 3) * 0.08,
            scrollTrigger: {
              trigger: element,
              start: "top 92%",
              once: true
            }
          });
        });
      });

    // Gentle ticker loop
    const ticker = $(".ticker-track");

    if (ticker) {
      gsap.to(ticker, {
        xPercent: -50,
        duration: 28,
        ease: "none",
        repeat: -1
      });
    }

    // Project introduction typography
    const workTitle = $(".work-stage h2");

    if (workTitle) {
      gsap.from(workTitle, {
        y: 45,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: workTitle,
          start: "top 82%",
          once: true
        }
      });
    }

    // Parallax movement is subtle and desktop-only
    if (finePointer.matches) {
      $$(".work-preview").forEach((preview, index) => {
        gsap.to(preview, {
          y: index === 0 ? -18 : 18,
          ease: "none",
          scrollTrigger: {
            trigger: ".work-intro",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8
          }
        });
      });
    }

    // Draw the timeline rail as it enters the viewport
    const timelineRail = $(".timeline-rail");

    if (timelineRail) {
      gsap.from(timelineRail, {
        scaleY: 0,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: {
          trigger: ".timeline",
          start: "top 75%",
          end: "bottom 65%",
          scrub: 0.7
        }
      });
    }

    // Gentle floating on the information chips
    $$(".portrait-chip").forEach((chip, index) => {
      gsap.to(chip, {
        y: index === 0 ? -5 : 5,
        duration: 2.6 + index * 0.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });

    // Animate the project screenshot on hover
    $$(".project-card").forEach((card) => {
      const image = $(".project-visual img", card);

      if (!image) return;

      card.addEventListener("pointerenter", () => {
        if (motionPaused) return;

        gsap.to(image, {
          scale: 1.035,
          duration: 0.65,
          ease: "power2.out"
        });
      });

      card.addEventListener("pointerleave", () => {
        gsap.to(image, {
          scale: 1,
          duration: 0.6,
          ease: "power2.out"
        });
      });
    });

    ScrollTrigger.refresh();
  }

  // --------------------------------------------------
  // BUTTON MICRO-INTERACTIONS
  // --------------------------------------------------

  function setupButtonInteractions() {
    if (!gsapAvailable || !finePointer.matches || reducedMotion.matches) {
      return;
    }

    $$(".button, .nav-cta").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        if (motionPaused || transitionRunning) return;

        const rect = button.getBoundingClientRect();

        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        gsap.to(button, {
          x: x * 0.08,
          y: y * 0.08,
          duration: 0.3,
          ease: "power2.out"
        });
      });

      button.addEventListener("pointerleave", () => {
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.5)"
        });
      });
    });
  }

  // --------------------------------------------------
  // IMAGE FALLBACKS
  // --------------------------------------------------

  function setupImageFallbacks() {
    $$("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.classList.add("image-missing");
      });
    });
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  function initialize() {
    setupNavigationTransitions();
    startCursor();
    startPortraitTilt();
    setupActiveNavigation();
    setupAnimations();
    setupButtonInteractions();
    setupImageFallbacks();

    window.addEventListener("load", () => {
      if (scrollTriggerAvailable) {
        ScrollTrigger.refresh();
      }
    });

    window.addEventListener("resize", () => {
      if (scrollTriggerAvailable) {
        ScrollTrigger.refresh();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();