// Site-wide behaviour: the can-opener drawing, the intro on the home page and the joke ads.
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A can seen from above with an opener going round the rim. unlock.v3.js shows it while a password
  // is being checked; the intro and the 404 page carry their own copy inline. Styles: .opener in site.v2.css.
  const OPENER =
    '<svg class="opener opener--loop" viewBox="0 0 140 140" aria-hidden="true" focusable="false">' +
    '<circle class="opener__rim" cx="70" cy="70" r="46"/>' +
    '<circle class="opener__inside" cx="70" cy="70" r="40"/>' +
    '<g class="opener__lid"><circle class="opener__lid-face" cx="70" cy="70" r="40"/>' +
    '<circle class="opener__ring" cx="70" cy="70" r="31"/><circle class="opener__ring" cx="70" cy="70" r="21"/></g>' +
    '<circle class="opener__cut" cx="70" cy="70" r="42" transform="rotate(-90 70 70)"/>' +
    '<g class="opener__tool"><g class="opener__lever">' +
    '<path class="opener__blade" d="M66.5 19h7l-3.5 10.5z"/>' +
    '<rect class="opener__handle" x="68" y="13" width="34" height="10" rx="5" transform="rotate(-14 70 18)"/>' +
    '<circle class="opener__pivot" cx="70" cy="18" r="3.2"/>' +
    "</g></g></svg>";
  window.SabaOpener = { markup: OPENER };

  // Intro: the inline script in <head> adds .intro-on once per session. A click or any key skips it.
  const intro = document.querySelector(".intro");
  if (intro) {
    const end = () => {
      root.classList.remove("intro-on");
      intro.remove();
    };
    if (!root.classList.contains("intro-on")) {
      intro.remove();
    } else {
      intro.addEventListener("animationend", (ev) => {
        if (ev.target === intro) end();
      });
      intro.addEventListener("click", end);
      window.addEventListener("keydown", end, { once: true });
    }
  }

  // 鯖's apology cannot be pressed. It bows instead.
  for (const ad of document.querySelectorAll('[data-ad="bow"]')) {
    ad.addEventListener("click", () => {
      if (ad.classList.contains("is-bowing")) return;
      ad.classList.add("is-bowing");
      setTimeout(() => ad.classList.remove("is-bowing"), 1600);
    });
  }

  // 「の」 spins away before following its link.
  for (const ad of document.querySelectorAll('[data-ad="spin"]')) {
    ad.addEventListener("click", (ev) => {
      if (reduceMotion || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      ad.classList.add("is-spinning");
      setTimeout(() => {
        window.location.href = ad.href;
      }, 650);
    });
  }

  // Coming back with the browser's back button restores the page from cache with the glyph still gone.
  window.addEventListener("pageshow", () => {
    for (const ad of document.querySelectorAll(".is-spinning")) ad.classList.remove("is-spinning");
  });
})();
