// Fig. 1 is the thing the product actually is: a core, the departments under
// it, the workers in those departments, and the two parts that feed it — the
// engine around the outside and the downloader below. Particles run the edges
// the way a goal runs through the team.

window.__lastsoftMotion = false;

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ run */
function run() {
  const panel = document.getElementById("run");
  if (!panel) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = [...panel.querySelectorAll(".node")];
  const edges = [...panel.querySelectorAll(".edges path")];
  const bar = panel.querySelector(".run-bar i");
  const num = panel.querySelector(".run-n");
  const suffix = panel.querySelector(".run-suffix");

  edges.forEach((path) => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = reduce ? "0" : String(len);
  });

  if (reduce) {
    nodes.forEach((n) => n.classList.add("in"));
    if (bar) bar.style.width = "6%";
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      nodes.forEach((n, i) => {
        n.style.transitionDelay = 140 + i * 95 + "ms";
        n.classList.add("in");
      });
      edges.forEach((p, i) => {
        p.style.transitionDelay = 300 + i * 130 + "ms";
        p.style.strokeDashoffset = "0";
      });
      cycle();
    },
    { margin: "0px 0px -12% 0px" }
  );
  io.observe(panel);

  /* The context cycle: fill, compress, unpack, repeat. */
  let timer = null;
  function cycle() {
    const seq = [
      { w: "100%", n: "1.2B", s: "\u00b7 reading it all", t: 3600 },
      { w: "6%",   n: "8k",   s: "\u00b7 compressed", t: 2400 },
      { w: "100%", n: "1.2B", s: "\u00b7 unpacked", t: 1800 },
    ];
    let i = 0;
    const step = () => {
      const c = seq[i % seq.length];
      i += 1;
      if (bar) bar.style.width = c.w;
      if (num) num.textContent = c.n;
      if (suffix) suffix.textContent = c.s;
      panel.dataset.phase = String(i % seq.length);
      timer = setTimeout(step, c.t);
    };
    timer = setTimeout(step, 1200);
  }
}

/* -------------------------------------------------------------- reveals */
function reveals() {
  const targets = [...document.querySelectorAll("[data-reveal]")];
  const motion = window.Motion;

  if (!targets.length || !motion?.animate) {
    document.documentElement.classList.remove("motion");
    return;
  }

  const { animate, inView } = motion;
  window.__lastsoftMotion = true;

  if (reduce) {
    document.documentElement.classList.remove("motion");
    return;
  }

  for (const el of targets) {
    inView(
      el,
      () => {
        const siblings = [...(el.parentElement?.children ?? [])];
        const index = siblings.indexOf(el);
        animate(
          el,
          { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"], filter: ["blur(7px)", "blur(0px)"] },
          {
            duration: 0.85,
            delay: Math.min(Math.max(index, 0) * 0.055, 0.28),
            easing: [0.16, 1, 0.3, 1],
          }
        );
      },
      { margin: "0px 0px -12% 0px" }
    );
  }
}

/* ---------------------------------------------------------------- copies */
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

run();
reveals();
copies();
