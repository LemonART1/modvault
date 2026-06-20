// ============================================================
//  effects.js - particles, scroll reveals, subtle interactions
// ============================================================

(function () {
  "use strict";

  const interactiveSelector = "a, button, .mod-card, .game-card, .tag, [onclick]";

  /* 1. POINTER FEEDBACK */

  document.addEventListener("click", e => {
    if (!e.target.closest(interactiveSelector)) return;

    const flash = document.createElement("span");
    flash.className = "tap-flash";
    flash.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
    document.body.appendChild(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  });

  document.addEventListener("pointermove", e => {
    const card = e.target.closest?.(".game-card, .mod-card");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });

  /* 2. PARTICLE CANVAS (home page only) */

  const canvas = document.getElementById("particle-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W, H, particles = [];
    const COUNT = 60;
    const ACCENT = [232, 255, 0];

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 10;
        this.vx = (Math.random() - .5) * .4;
        this.vy = -(Math.random() * .6 + .2);
        this.r = Math.random() * 1.5 + .5;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 150;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (this.life > this.maxLife || this.y < -10) this.reset();
      }
      draw() {
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * .55;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${alpha})`;
        ctx.fill();
      }
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * .1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${alpha})`;
            ctx.lineWidth = .5;
            ctx.stroke();
          }
        }
      }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    (function loop() {
      ctx.clearRect(0, 0, W, H);
      drawConnections();
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(loop);
    })();
  }

  /* 3. SCROLL REVEAL */

  function setupReveal() {
    const targets = document.querySelectorAll(
      ".mod-card, .feat-item, .modal-stat, .stats-row-item"
    );
    targets.forEach(el => el.classList.add("reveal"));

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const siblings = [...entry.target.parentElement.children];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${(idx % 4) * 60}ms`;
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(el => io.observe(el));
  }

  window.setupReveal = setupReveal;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupReveal);
  } else {
    setupReveal();
  }

  /* 4. HERO TITLE GLITCH */

  const heroTitle = document.querySelector(".hero-title");
  if (heroTitle) {
    heroTitle.setAttribute("data-text", heroTitle.textContent);
    setInterval(() => {
      heroTitle.classList.add("glitch");
      setTimeout(() => heroTitle.classList.remove("glitch"), 400);
    }, 5000);
  }

  /* 5. HOME MENU ANIMATION */

  function replayHomeMenu() {
    const cards = document.querySelectorAll(".game-card");
    if (!cards.length) return;

    cards.forEach((card, index) => {
      card.style.animation = "none";
      card.style.animationDelay = `${180 + index * 180}ms`;
      void card.offsetHeight;
      card.style.animation = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", replayHomeMenu);
  } else {
    replayHomeMenu();
  }
  window.addEventListener("pageshow", replayHomeMenu);
})();
