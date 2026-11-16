// The release files are resolved at load time so the buttons never point at a
// version that has been replaced. If GitHub's API refuses (rate limit, offline),
// every button falls back to the release page it already links to.

const REPO = "TheSyrianDev/LastAI";
const API = `https://api.github.com/repos/${REPO}/releases?per_page=1`;

const SUFFIXES = {
  appimage: ".AppImage",
  deb: "amd64.deb",
  rpm: "-x86_64.rpm",
  pkg: "-x86_64.pkg.tar.zst",
  dmg: ".dmg",
  zip: ".zip",
};

function bytes(n) {
  if (!n) return "";
  const mb = n / 1e6;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function detectOS() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "other";
}

const OS_LABEL = {
  linux: "Linux · the script checks your distribution",
  windows: "Windows",
  macos: "macOS",
  android: "Android — no build for this",
  other: "Unrecognised system",
};

function markSystem() {
  const os = detectOS();
  document.body.dataset.os = os;

  const out = document.getElementById("detect-os");
  if (out) out.textContent = OS_LABEL[os] ?? os;

  const row = document.querySelector(`.dl-row[data-os="${os}"]`);
  if (row) {
    row.dataset.detected = "true";
    const flag = row.querySelector("[data-flag-for]");
    if (flag) {
      flag.textContent = "your system";
      flag.dataset.detected = "true";
    }
  }
}

async function release() {
  const versionOut = document.getElementById("detect-version");
  const dateOut = document.getElementById("detect-date");

  let rel;
  try {
    const response = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(String(response.status));
    const list = await response.json();
    rel = list?.[0];
  } catch {
    if (versionOut) versionOut.textContent = "on the release page";
    if (dateOut) dateOut.textContent = "—";
    return;
  }

  if (!rel?.assets) return;

  if (versionOut) versionOut.textContent = (rel.tag_name ?? "").replace(/^v/, "");
  if (dateOut) dateOut.textContent = formatDate(rel.published_at);

  for (const [key, suffix] of Object.entries(SUFFIXES)) {
    const asset = rel.assets.find((a) => a.name.endsWith(suffix));
    if (!asset) continue;

    const link = document.querySelector(`a[data-asset="${key}"]`);
    if (!link) continue;

    link.href = asset.browser_download_url;
    const size = bytes(asset.size);
    if (size) {
      const tag = document.createElement("span");
      tag.className = "dl-size";
      tag.textContent = size;
      link.append(" ", tag);
    }
    link.setAttribute("download", "");
  }
}

function copies() {
  for (const button of document.querySelectorAll(".copy")) {
    button.addEventListener("click", async () => {
      const holder = button.closest(".cmd");
      const value = holder?.dataset.copy ?? "";
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied";
        button.dataset.copied = "true";
        setTimeout(() => {
          button.textContent = "Copy";
          delete button.dataset.copied;
        }, 1800);
      } catch {
        button.textContent = "Select it";
        window.getSelection?.()?.selectAllChildren(holder.querySelector("code"));
      }
    });
  }
}

function reveals() {
  const motion = window.Motion;
  const targets = [...document.querySelectorAll(".dl-row, .detect, .download > *")];
  if (!motion?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.remove("motion");
    return;
  }

  targets.forEach((el, index) => {
    el.style.opacity = "0";
    motion.animate(
      el,
      { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] },
      { duration: 0.7, delay: Math.min(index * 0.07, 0.4), easing: [0.16, 1, 0.3, 1] }
    );
  });
}

markSystem();
release();
copies();
reveals();
