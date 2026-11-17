// Theme: the site's own palette, the ones Omarchy ships, and — when the
// LastHarness theme service is running — whatever theme your desktop is using
// right now. The shipped list comes from tools/build-themes.py; the live one
// comes from `lastai-theme` on 127.0.0.1 (see LastAI's docs/website-theme.md).

const THEMES = window.__LASTAI_THEMES || [];
const BRIDGE = window.__LASTAI_THEME_BRIDGE || "http://127.0.0.1:8787";
const KEY = "lastai-site-theme";
const CACHE = "lastai-site-vars";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

const root = document.documentElement;
const byId = new Map(THEMES.map((theme) => [theme.id, theme]));

/* ------------------------------------------------------------- colour maths */
function rgb(value) {
  const hex = value.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const hexOf = (parts) =>
  "#" +
  parts
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("");

function mix(a, b, t) {
  const pa = rgb(a);
  const pb = rgb(b);
  return hexOf(pa.map((c, i) => c + (pb[i] - c) * t));
}

function alpha(colour, a) {
  const [r, g, b] = rgb(colour);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function luminance(colour) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(colour);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const on = (colour) =>
  (luminance(colour) + 0.05) / 0.05 >= 1.05 / (luminance(colour) + 0.05)
    ? "#000000"
    : "#ffffff";

// The same mapping as tools/build-themes.py, so a live theme and a shipped one
// look identical when their colors.toml matches.
function tokens(palette) {
  const ground = palette.background;
  const ink = palette.foreground;
  const accent = palette.accent || palette.blue || ink;
  const secondary = palette.orange || palette.yellow || accent;
  const leaf = palette.green || accent;
  return {
    "--ground": ground,
    "--ground-2": mix(ground, ink, 0.06),
    "--ground-3": mix(ground, ink, 0.1),
    "--ink": ink,
    "--muted": mix(ink, ground, 0.34),
    "--accent": accent,
    "--accent-2": secondary,
    "--leaf": leaf,
    "--selection": palette.selection || mix(ground, ink, 0.16),
    "--hair": alpha(ink, 0.14),
    "--hair-strong": alpha(ink, 0.28),
    "--tint": alpha(accent, 0.06),
    "--glow": alpha(accent, 0.055),
    "--scroll": mix(ground, ink, 0.18),
    "--scroll-hover": mix(ground, ink, 0.26),
    "--on-accent": on(accent),
  };
}

/* ------------------------------------------------------------------ state */
const state = {
  choice: "auto",
  desktop: null, // { name, mode, palette }
  online: false,
  painted: [],
  paintedName: "",
};

function stored() {
  try {
    return localStorage.getItem(KEY) || "auto";
  } catch {
    return "auto";
  }
}

function remember(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {}
}

function cached() {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ paint */
function clearInline() {
  for (const name of state.painted) root.style.removeProperty(name);
  state.painted = [];
}

function metaTag() {
  let tag = document.querySelector('meta[name="theme-color"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "theme-color";
    document.head.appendChild(tag);
  }
  return tag;
}

function paint(id) {
  const theme = byId.get(id);

  // An unknown id means the stored choice named a theme this build no longer
  // ships; the site's own palette is the safe landing.
  if (!theme && id !== "last") return paint("last");

  draw(() => {
    clearInline();
    if (theme) {
      root.dataset.theme = id;
      root.style.colorScheme = theme.mode;
      state.paintedName = theme.name;
      metaTag().setAttribute("content", theme.swatch[0]);
      syncButton();
    } else {
      root.dataset.theme = "last";
      root.style.colorScheme = "dark";
      state.paintedName = "Last";
      metaTag().setAttribute("content", "#0b120e");
      syncButton();
    }
  });
  notify();
}

function paintDesktop(desktop) {
  const vars = tokens(desktop.palette);
  draw(() => {
    clearInline();
    root.dataset.theme = "last";
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
      state.painted.push(name);
    }
    root.style.colorScheme = desktop.mode || "dark";
    state.paintedName = desktop.name;
    metaTag().setAttribute("content", vars["--ground"]);
    try {
      localStorage.setItem(CACHE, JSON.stringify({ ...desktop, vars }));
    } catch {}
    syncButton();
  });
  notify();
}

function notify() {
  document.dispatchEvent(new CustomEvent("lastai:theme"));
}

function draw(change) {
  const view = document.startViewTransition;
  if (!view || reduce.matches) {
    change();
  } else {
    document.startViewTransition(change);
  }
}

/* ---------------------------------------------------------------- choosing */
function choose(choice) {
  state.choice = choice;
  remember(choice);
  render();
}

function render() {
  if (state.choice === "auto") {
    if (state.desktop) paintDesktop(state.desktop);
    else paint("last");
  } else {
    paint(state.choice);
  }
  syncButton();
  markPicker();
}

/* -------------------------------------------------------------- masthead */
function syncButton() {
  const label = document.querySelector("[data-theme-label]");
  const swatch = document.querySelector("[data-theme-swatch]");
  if (label) {
    label.textContent = state.choice === "auto" ? `Desktop · ${state.paintedName}` : state.paintedName;
  }
  if (swatch) {
    const styles = getComputedStyle(root);
    swatch.style.background = `linear-gradient(90deg, ${styles
      .getPropertyValue("--ground")
      .trim()} 0 25%, ${styles.getPropertyValue("--ink").trim()} 25% 50%, ${styles
      .getPropertyValue("--accent")
      .trim()} 50% 75%, ${styles.getPropertyValue("--accent-2").trim()} 75% 100%)`;
  }
}

/* ----------------------------------------------------------------- picker */
let picker;
let pickerNote;
let pickerRows = new Map();

function buildPicker() {
  picker = document.createElement("dialog");
  picker.className = "picker";
  picker.setAttribute("aria-label", "Theme");

  const head = document.createElement("header");
  head.className = "picker-head";
  head.innerHTML =
    '<h2 class="picker-title">Theme</h2>' +
    '<p class="picker-note">Pick one, or let your desktop pick. Press <kbd>T</kbd> anywhere to open this.</p>' +
    '<button type="button" class="picker-close" aria-label="Close">Esc</button>';
  picker.append(head);

  const list = document.createElement("div");
  list.className = "picker-list";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Themes");

  const auto = row("auto", "Your desktop", "Following", [
    "var(--ground)",
    "var(--ink)",
    "var(--accent)",
    "var(--accent-2)",
  ]);
  list.append(auto);

  for (const theme of THEMES) {
    list.append(row(theme.id, theme.name, theme.mode === "light" ? "light" : "dark", theme.swatch));
  }
  picker.append(list);

  pickerNote = document.createElement("p");
  pickerNote.className = "picker-foot";
  picker.append(pickerNote);

  picker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-id]");
    if (button) {
      choose(button.dataset.themeId);
      syncButton();
    }
    if (event.target === picker || event.target.closest(".picker-close")) picker.close();
  });

  picker.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const rows = [...picker.querySelectorAll("[data-theme-id]")];
    const at = rows.indexOf(document.activeElement);
    const next = rows[(at + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length];
    next?.focus();
  });

  document.body.append(picker);
}

function row(id, name, note, swatch) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "picker-row";
  button.dataset.themeId = id;
  button.innerHTML =
    `<span class="picker-swatch" aria-hidden="true" style="background:linear-gradient(90deg,` +
    `${swatch[0]} 0 25%, ${swatch[1]} 25% 50%, ${swatch[2]} 50% 75%, ${swatch[3]} 75% 100%)"></span>` +
    `<span class="picker-name">${name}</span>` +
    `<span class="picker-tag">${note}</span>`;
  pickerRows.set(id, button);
  return button;
}

function markPicker() {
  if (!picker) return;
  for (const [id, button] of pickerRows) {
    const on = id === state.choice;
    button.dataset.on = String(on);
    button.setAttribute("aria-pressed", String(on));
  }
  if (pickerNote) {
    if (state.online && state.desktop) {
      pickerNote.textContent = `Reading your desktop theme: ${state.desktop.name}. It changes as you switch themes.`;
    } else if (state.desktop) {
      pickerNote.textContent = `Last seen on your desktop: ${state.desktop.name}. The theme service is not answering right now.`;
    } else {
      pickerNote.textContent =
        "Your desktop theme is read locally by LastHarness on Omarchy; without it this page uses the picker.";
    }
  }
  const auto = pickerRows.get("auto");
  if (auto) {
    auto.querySelector(".picker-name").textContent = state.desktop
      ? `Your desktop · ${state.desktop.name}`
      : "Your desktop";
    auto.querySelector(".picker-tag").textContent = state.online
      ? "live"
      : state.desktop
        ? "last seen"
        : "not found";
  }
}

function openPicker() {
  const scroll = window.scrollY;
  picker.showModal();
  const current = picker.querySelector('[data-theme-id][data-on="true"]');
  (current || picker.querySelector("[data-theme-id]"))?.focus();
  picker.addEventListener(
    "close",
    () => window.scrollTo({ top: scroll }),
    { once: true }
  );
}

/* ----------------------------------------------------------------- bridge */
function takeTheme(payload) {
  if (!payload?.palette?.background || !payload.palette.foreground) return false;
  const same =
    state.desktop &&
    state.desktop.name === payload.name &&
    state.desktop.mode === payload.mode;
  state.desktop = { name: payload.name, mode: payload.mode, palette: payload.palette };
  state.online = true;
  if (!same || state.choice === "auto") render();
  else syncButton();
  return true;
}

async function ask() {
  try {
    const response = await fetch(`${BRIDGE}/theme.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    takeTheme(await response.json());
    listen();
  } catch {
    state.online = false;
    markPicker();
  }
}

let listening = false;
function listen() {
  if (listening || !("EventSource" in window)) return;
  listening = true;
  try {
    const events = new EventSource(`${BRIDGE}/events`);
    events.onmessage = (event) => {
      try {
        takeTheme(JSON.parse(event.data));
      } catch {}
    };
    events.onerror = () => {
      state.online = false;
      markPicker();
    };
  } catch {}
}

/* ------------------------------------------------------------------- boot */
function boot() {
  state.choice = stored();
  if (state.choice === "auto") {
    const saved = cached();
    if (saved?.palette) state.desktop = saved;
  }

  buildPicker();
  render();

  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName ?? "");
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      picker.open ? picker.close() : openPicker();
    }
  });

  for (const button of document.querySelectorAll("[data-theme-open]")) {
    button.addEventListener("click", openPicker);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ask();
  });

  ask();
  openPickerIfAsked();
}

function openPickerIfAsked() {
  if (location.hash === "#theme") openPicker();
  if (new URLSearchParams(location.search).get("theme")) {
    const wanted = new URLSearchParams(location.search).get("theme");
    if (wanted === "desktop") choose("auto");
    else if (byId.has(wanted)) choose(wanted);
    else openPicker();
  }
}

boot();
window.__lastaiTheme = { choose, open: openPicker, state };
