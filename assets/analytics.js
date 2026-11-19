/* Google Analytics 4 with an explicit consent step (EU/GDPR).
 * Nothing from Google loads until the visitor presses "Accept".
 * Choice is kept in localStorage under "ga-consent" ("granted" | "denied"). */
(function () {
  var MEASUREMENT_ID = "G-FGPYJM8XWL";
  var STORAGE_KEY = "ga-consent";

  function readChoice() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch (e) {
      /* private mode: choice lasts for this page only */
    }
  }

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
    var script = document.createElement("script");
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function showBanner() {
    var bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Analytics consent");
    bar.style.cssText =
      "position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;" +
      "padding:14px 16px;border-radius:10px;background:#111827;color:#f9fafb;" +
      "font:14px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);" +
      "display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:2147483647";

    var text = document.createElement("span");
    text.style.flex = "1 1 240px";
    text.textContent =
      "I use Google Analytics to see which pages are read. It only runs if you accept.";

    function button(label, primary, choice) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "padding:8px 14px;border-radius:8px;border:1px solid #6b7280;cursor:pointer;" +
        "font:inherit;" +
        (primary
          ? "background:#f9fafb;color:#111827;border-color:#f9fafb"
          : "background:transparent;color:#f9fafb");
      b.addEventListener("click", function () {
        saveChoice(choice);
        bar.remove();
        if (choice === "granted") loadAnalytics();
      });
      return b;
    }

    bar.appendChild(text);
    bar.appendChild(button("Decline", false, "denied"));
    bar.appendChild(button("Accept", true, "granted"));
    document.body.appendChild(bar);
  }

  var choice = readChoice();
  if (choice === "granted") {
    loadAnalytics();
  } else if (choice !== "denied") {
    if (document.body) showBanner();
    else document.addEventListener("DOMContentLoaded", showBanner);
  }
})();
