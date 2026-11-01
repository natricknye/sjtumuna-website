const cloudbaseConfig = window.CLOUDBASE_CONFIG;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let cloudbaseApp = null;
let cloudbaseSdkPromise = null;

document.querySelectorAll(".site-nav a.active").forEach((link) => {
  link.setAttribute("aria-current", "page");
});

function getCloudbaseApp() {
  if (cloudbaseApp) return Promise.resolve(cloudbaseApp);
  if (!cloudbaseConfig?.env || !cloudbaseConfig?.publishableKey) return Promise.resolve(null);
  if (window.cloudbase?.init) {
    cloudbaseApp = window.cloudbase.init({
      env: cloudbaseConfig.env,
      region: "ap-shanghai",
      accessKey: cloudbaseConfig.publishableKey,
    });
    return Promise.resolve(cloudbaseApp);
  }
  if (!cloudbaseSdkPromise) {
    cloudbaseSdkPromise = new Promise((resolve, reject) => {
      const sdkScript = document.createElement("script");
      sdkScript.src = "https://static.cloudbase.net/cloudbase-js-sdk/3.0.1/cloudbase.full.js";
      sdkScript.async = true;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        sdkScript.onload = null;
        sdkScript.onerror = null;
        if (error) {
          sdkScript.remove();
          reject(error);
        } else {
          resolve(window.cloudbase);
        }
      };
      const timeout = window.setTimeout(() => finish(new TypeError("CloudBase SDK loading timed out")), 20000);
      sdkScript.onload = () => finish(window.cloudbase?.init
        ? null
        : new TypeError("CloudBase SDK did not initialize"));
      sdkScript.onerror = () => finish(new TypeError("CloudBase SDK could not be loaded"));
      document.head.append(sdkScript);
    });
  }
  return cloudbaseSdkPromise.then((cloudbase) => {
    cloudbaseApp = cloudbase.init({
      env: cloudbaseConfig.env,
      region: "ap-shanghai",
      accessKey: cloudbaseConfig.publishableKey,
    });
    return cloudbaseApp;
  }).catch((error) => {
    cloudbaseSdkPromise = null;
    throw error;
  });
}

const homeIntro = document.querySelector("#home-intro");
if (homeIntro && document.documentElement.classList.contains("home-intro-pending")) {
  const finishHomeIntro = () => {
    if (!document.documentElement.classList.contains("home-intro-pending")) return;
    document.documentElement.classList.remove("home-intro-pending");
    document.documentElement.classList.add("home-content-entering");
    document.querySelectorAll("main .reveal-on-scroll").forEach((element) => element.classList.add("is-visible"));
    homeIntro.remove();
    window.setTimeout(() => document.documentElement.classList.remove("home-content-entering"), 1450);
  };
  homeIntro.addEventListener("animationend", (event) => {
    if (event.target === homeIntro && event.animationName === "home-intro-dismiss") finishHomeIntro();
  });
  window.setTimeout(finishHomeIntro, 2850);
}

const delegateForm = document.querySelector("#delegate-form");
if (delegateForm) {
  const nameInput = delegateForm.elements.namedItem("name");
  const idInput = delegateForm.elements.namedItem("delegate-id");
  const venueInput = delegateForm.elements.namedItem("venue");
  const validationFields = [
    { element: nameInput, isValid: () => Boolean(nameInput.value.trim()) },
    { element: idInput, isValid: () => Boolean(idInput.value.trim()) },
    { element: venueInput, isValid: () => Number(venueInput.value) >= 1 && Number(venueInput.value) <= 4 },
  ];
  validationFields.forEach(({ element, isValid }) => {
    const updateInvalidState = () => {
      if (isValid()) element.removeAttribute("aria-invalid");
    };
    element.addEventListener("input", updateInvalidState);
    element.addEventListener("change", updateInvalidState);
  });

  delegateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(delegateForm);
    const name = String(formData.get("name")).trim();
    const id = String(formData.get("delegate-id")).trim();
    const venue = Number(formData.get("venue"));
    const notice = document.querySelector("#delegate-notice");
    notice.classList.remove("success", "info");
    notice.classList.add("show");
    validationFields.forEach(({ element, isValid }) => {
      if (isValid()) element.removeAttribute("aria-invalid");
      else element.setAttribute("aria-invalid", "true");
    });
    const firstInvalidField = validationFields.find(({ isValid }) => !isValid())?.element;
    if (firstInvalidField) {
      window.munShowNotice(notice, "common.required");
      notice.classList.add("info");
      firstInvalidField.focus();
      return;
    }
    if (!cloudbaseConfig?.env || !cloudbaseConfig?.publishableKey) {
      window.munShowNotice(notice, "error.config");
      notice.classList.add("info");
      return;
    }

    const button = delegateForm.querySelector("button[type='submit']");
    button.disabled = true;
    const buttonLabel = button.querySelector("[data-i18n]");
    buttonLabel.textContent = window.munTranslate("common.submitting");
    try {
      const app = await getCloudbaseApp();
      if (!app) throw new TypeError("CloudBase is not configured");
      const response = await app.callFunction({
        name: "delegates_api",
        data: { action: "verify", name, delegate_no: id, venue_preference: venue },
        parse: true,
      });
      const result = typeof response.result === "string"
        ? JSON.parse(response.result)
        : response.result;
      if (!result?.ok) {
        console.error("Delegate verification rejected:", result?.code || "empty_result");
        const messageKey = result?.code === "code_not_found"
          ? "error.codeNotFound"
          : result?.code === "code_already_claimed"
            ? "error.duplicate"
            : result?.code === "invalid_input"
              ? "common.required"
              : "error.server";
        throw new Error(messageKey);
      }
      window.munShowNotice(notice, "delegate.success", { name, id, venue });
      notice.classList.remove("info");
      notice.classList.add("success");
      delegateForm.reset();
    } catch (error) {
      console.error("Registration submission failed:", error);
      const knownErrorKeys = new Set(["error.codeNotFound", "error.duplicate", "common.required"]);
      const messageKey = error instanceof TypeError
        ? "error.network"
        : knownErrorKeys.has(error.message)
          ? error.message
          : "error.server";
      window.munShowNotice(notice, messageKey);
      notice.classList.remove("success");
      notice.classList.add("info");
    } finally {
      button.disabled = false;
      buttonLabel.textContent = window.munTranslate("delegate.submit");
    }
  });
}

const presidentForm = document.querySelector("#president-form");
if (presidentForm) {
  presidentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const notice = document.querySelector("#president-notice");
    const password = new FormData(presidentForm).get("password");
    if (!password) {
      window.munShowNotice(notice, "common.required");
      notice.classList.add("info");
      return;
    }
    window.munShowNotice(notice, "chair.loginNotice");
    notice.classList.add("info");
    presidentForm.reset();
  });
}

const forumRegistrationForm = document.querySelector("#forum-registration-form");
if (forumRegistrationForm) {
  // Forum registration is closed: keep the card readable, never send data.
  forumRegistrationForm.querySelectorAll("input, select, button").forEach((field) => {
    field.disabled = true;
  });
  forumRegistrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const notice = document.querySelector("#forum-registration-notice");
    if (notice && window.munShowNotice) {
      window.munShowNotice(notice, "forum.closedNotice");
      notice.classList.add("info");
      notice.hidden = false;
    }
  });
}

// A tiny page-position indicator and pointer response add feedback without extra libraries.
const scrollProgress = document.createElement("div");
scrollProgress.className = "scroll-progress";
scrollProgress.setAttribute("aria-hidden", "true");
document.body.append(scrollProgress);
let scrollProgressFrame = 0;
const updateScrollProgress = () => {
  if (scrollProgressFrame) return;
  scrollProgressFrame = window.requestAnimationFrame(() => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollableHeight > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollableHeight * 100)) : 0;
    scrollProgress.style.setProperty("--scroll-progress", `${percentage}%`);
    scrollProgressFrame = 0;
  });
};
window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress, { passive: true });
updateScrollProgress();

if (!motionPreference.matches && document.body.classList.contains("home-page")) {
  document.querySelectorAll(".portal-card").forEach((card) => {
    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    card.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const bounds = card.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = Math.min(1, Math.max(0, (pointerX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (pointerY - bounds.top) / bounds.height));
        card.style.setProperty("--pointer-x", `${x * 100}%`);
        card.style.setProperty("--pointer-y", `${y * 100}%`);
        card.style.setProperty("--tilt-x", `${(0.5 - y) * 3}deg`);
        card.style.setProperty("--tilt-y", `${(x - 0.5) * 3}deg`);
      });
    });
    card.addEventListener("pointerleave", () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      card.style.removeProperty("--pointer-x");
      card.style.removeProperty("--pointer-y");
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });
}

// Reveal large content blocks as they enter the viewport, like a gentle rise.
const revealSelector = "main > .page-intro, main > .content-grid > *, main > .event-overview, main > .section-block, main > .public-content > section, main > .public-content > article, main .committee-card";
const revealItems = [...new Set(document.querySelectorAll(revealSelector))];

revealItems.forEach((element) => {
  element.classList.add("reveal-on-scroll");
  const siblings = [...element.parentElement.children].filter((sibling) => sibling.matches(revealSelector));
  const stagger = Math.min(Math.max(siblings.indexOf(element), 0), 4) * 75;
  element.style.setProperty("--reveal-delay", `${stagger}ms`);
});

// Keyboard navigation must never focus an invisible, not-yet-revealed panel.
document.addEventListener("focusin", (event) => {
  for (let element = event.target; element instanceof Element; element = element.parentElement) {
    if (element.classList.contains("reveal-on-scroll")) element.classList.add("is-visible");
  }
});

if (!motionPreference.matches && "IntersectionObserver" in window) {
  document.documentElement.classList.add("has-scroll-reveal");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !document.documentElement.classList.contains("home-intro-pending")) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  revealItems.forEach((element) => revealObserver.observe(element));
} else {
  revealItems.forEach((element) => element.classList.add("is-visible"));
}
