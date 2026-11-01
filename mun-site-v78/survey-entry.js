/*
 * SJTUMUNC 官网 · 问卷入口
 * 用法：先在页面里配置 window.SJTUM_SURVEY，再加载本文件（defer）。
 * window.SJTUM_SURVEY = {
 *   url: "https://wj.qq.com/s2/xxxxx/xxxx/",
 *   entry: true,        // 左下角常驻入口（默认开启，一直可点）
 *   popup: true,        // 默认开启：使用 4 分钟后出现一次轻弹窗；false 关闭
 *   popupDelay: 240000, // 弹窗延迟，默认 4 分钟（同一标签页内跨页面累计）
 *   dismissDays: 7,     // 弹窗关闭/出现过后的冷却天数
 *   footer: false       // true = 额外在页脚加一条文字链接
 * };
 */
(function () {
  "use strict";

  var cfg = window.SJTUM_SURVEY || {};
  var url = typeof cfg.url === "string" ? cfg.url.trim() : "";
  if (!url) return; // 没配置链接时完全静默，避免上线死链

  var lang = (document.documentElement.lang || "zh").toLowerCase();
  var isZh = lang.indexOf("zh") === 0;
  var entryLabel = isZh ? "官网体验问卷" : "Website feedback";
  var footerLabel = isZh ? "官网体验问卷" : "Website feedback";
  var popupTitle = isZh ? "官网用得还顺手吗？" : "How is the website so far?";
  var popupText = isZh
    ? "占用约 2 分钟，匿名填写。你的反馈会直接用于改进下一版官网。"
    : "About 2 minutes, anonymous. Your feedback goes straight into the next version.";
  var popupCta = isZh ? "去填问卷" : "Take the survey";
  var popupLater = isZh ? "稍后再说" : "Maybe later";
  var closeLabel = isZh ? "关闭提示" : "Dismiss";

  function makeLink(className, text) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = className || "";
    a.setAttribute("data-sjtum-survey", "");
    a.setAttribute("aria-label", (text || footerLabel) + (isZh ? "（在新窗口打开）" : " (opens in a new tab)"));
    a.textContent = text || footerLabel;
    return a;
  }

  function onAstraPage() {
    return /(^|\/)astra(\.html)?$/i.test(location.pathname);
  }

  function addFooterLink() {
    if (document.querySelector("[data-sjtum-survey-footer]")) return;
    var host = document.querySelector(".footer-brand-copy") || document.querySelector(".footer-brand");
    if (!host) return;
    var link = makeLink("survey-footer-link");
    link.setAttribute("data-sjtum-survey-footer", "");
    host.appendChild(link);
  }

  function addEntry() {
    if (onAstraPage() || document.querySelector(".survey-entry")) return;
    if (!document.body) return;

    var a = makeLink("survey-entry", entryLabel);
    var arrow = document.createElement("span");
    arrow.className = "survey-entry-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    a.appendChild(arrow);
    document.body.appendChild(a);
  }

  var POPUP_KEY = "sjtum-survey-popup-shown-until";
  var SESSION_KEY = "sjtum-survey-session-start";
  var dismissDays = Number(cfg.dismissDays) > 0 ? Number(cfg.dismissDays) : 7;

  function sessionStart() {
    try {
      var started = Number(sessionStorage.getItem(SESSION_KEY));
      if (!started) {
        started = Date.now();
        sessionStorage.setItem(SESSION_KEY, String(started));
      }
      return started;
    } catch (e) {
      return Date.now();
    }
  }

  function popupCoolingDown() {
    try {
      return Number(localStorage.getItem(POPUP_KEY) || 0) > Date.now();
    } catch (e) {
      return false;
    }
  }

  function markPopupShown() {
    try {
      localStorage.setItem(POPUP_KEY, String(Date.now() + dismissDays * 86400000));
    } catch (e) {
      /* localStorage 不可用时只弹这一次 */
    }
  }

  function closePopup(card) {
    card.remove();
  }

  function showPopup() {
    if (onAstraPage() || popupCoolingDown() || document.querySelector(".survey-popup")) return;
    if (!document.body) return;

    markPopupShown();

    var card = document.createElement("div");
    card.className = "survey-popup";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "false");
    card.setAttribute("aria-labelledby", "survey-popup-title");

    var title = document.createElement("p");
    title.className = "survey-popup-title";
    title.id = "survey-popup-title";
    title.textContent = popupTitle;

    var text = document.createElement("p");
    text.className = "survey-popup-text";
    text.textContent = popupText;

    var actions = document.createElement("div");
    actions.className = "survey-popup-actions";

    var link = makeLink("survey-popup-link", popupCta);

    var later = document.createElement("button");
    later.type = "button";
    later.className = "survey-popup-later";
    later.textContent = popupLater;
    later.setAttribute("aria-label", closeLabel);
    later.addEventListener("click", function () {
      closePopup(card);
    });

    actions.appendChild(link);
    actions.appendChild(later);
    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(actions);
    document.body.appendChild(card);
  }

  function init() {
    if (cfg.footer === true) addFooterLink();
    if (cfg.entry !== false) addEntry();
    if (cfg.popup !== false) {
      var delay = Number(cfg.popupDelay);
      if (!(delay >= 0)) delay = 240000;
      // 同一标签页内跨页面累计：切页不会重新计时
      var remaining = delay - (Date.now() - sessionStart());
      setTimeout(showPopup, Math.max(0, remaining));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
