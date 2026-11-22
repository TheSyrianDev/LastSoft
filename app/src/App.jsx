import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Field from "./fx/Field.jsx";
import HeroScene from "./fx/HeroScene.jsx";

gsap.registerPlugin(ScrollTrigger);

const THEMES = [
  "catppuccin",
  "catppuccin-latte",
  "ethereal",
  "everforest",
  "flexoki-light",
  "gruvbox",
  "hackerman",
  "jade-horse",
  "kanagawa",
  "last-horizon",
  "lumon",
  "lupine",
  "matte-black",
  "miasma",
  "nord",
  "retro-82",
  "ristretto",
  "rose-pine",
  "solitude",
  "starship",
];

const PARTS = [
  {
    id: "studio",
    label: "P-01",
    name: "Last AI",
    href: "https://github.com/TheSyrianDev/LastAI",
    body: "The studio: a desktop app and a terminal client over a local core you run yourself.",
    meta: "0.1.0-alpha.3 · lai / lastai",
  },
  {
    id: "harness",
    label: "P-02",
    name: "LastHarness",
    href: "https://github.com/TheSyrianDev/LastHarness",
    body: "The turn loop underneath: prompt blocks, tool permissions, the team plan, the spend ledger.",
    meta: "own repo · lh / lastharness",
  },
  {
    id: "engine",
    label: "P-03",
    name: "LastEngine",
    href: "https://github.com/TheSyrianDev/LastEngine",
    body: "Inference in Rust. One backend trait, a hardware probe, and a server that speaks the local dialect.",
    meta: "0.1.0 · in development",
  },
  {
    id: "mdl",
    label: "P-04",
    name: "Model-Downloader",
    href: "https://github.com/TheSyrianDev/Last-Model-Downloader",
    body: "The model downloader. Models and datasets from the Hugging Face Hub and ModelScope, with resumable and verified transfers.",
    meta: "v0.4.0-rc.1",
  },
];

export default function App() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("lastai-site-theme") || "auto");
  const heroRef = useRef(null);

  const choose = (name) => {
    const root = document.documentElement;
    if (name === "auto") {
      localStorage.removeItem("lastai-site-theme");
      localStorage.removeItem("lastai-site-vars");
      delete root.dataset.theme;
    } else {
      localStorage.setItem("lastai-site-theme", name);
      root.dataset.theme = name;
    }
    setTheme(name);
    setPickerOpen(false);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      if (heroRef.current) {
        gsap.to(heroRef.current, {
          rotationY: 18,
          scale: 0.94,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <>
      <div className="bg-aurora" aria-hidden="true" />
      <Field />

      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <a className="brand" href="/LastSoft/">
          <img src="/LastSoft/assets/lastai.png" alt="" width="34" height="34" />
          <span>
            last <b>AI</b>
          </span>
        </a>
        <nav className="masthead-nav" aria-label="Sections">
          <a href="#studio">Studio</a>
          <a href="#crew">The team</a>
          <a href="/LastSoft/downloads.html">Download</a>
          <a href="/LastSoft/docs/">Docs</a>
          <a href="https://github.com/TheSyrianDev/LastAI">Source</a>
        </nav>
        <button
          className="theme-btn"
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
        >
          <span className="swatch" aria-hidden="true" />
          Theme
        </button>
        {pickerOpen && (
          <div className="picker" role="dialog" aria-label="Choose a theme">
            <button type="button" onClick={() => choose("auto")} className={theme === "auto" ? "on" : ""}>
              Follow system
            </button>
            {THEMES.map((t) => (
              <button key={t} type="button" onClick={() => choose(t)} className={theme === t ? "on" : ""}>
                {t}
              </button>
            ))}
          </div>
        )}
      </header>

      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <h1 className="display" data-reveal>
              The last AI studio
              <br />
              you&apos;ll need.
            </h1>
            <p className="lede" data-reveal>
              A local-first AI studio that works as a team. Your assistant hands a bigger goal to a{" "}
              <strong>department</strong>, whose lead splits it across workers, runs what can run together and
              checks the result before you see it. The conversation, the memory, the tools and the money stay on
              your machine. Underneath: a harness, an inference engine and a model downloader, each useful
              alone. No account, no cloud.
            </p>
            <div className="hero-actions" data-reveal>
              <a className="button" href="/LastSoft/downloads.html">
                Download for your system
              </a>
              <a className="link-arrow" href="#crew">
                See the team work
              </a>
            </div>
            <dl className="spec" data-reveal>
              <div>
                <dt>Current</dt>
                <dd>0.1.0-alpha.3</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>PolyForm NC 1.0.0</dd>
              </div>
              <div>
                <dt>Runs on</dt>
                <dd>Linux · Windows · macOS</dd>
              </div>
            </dl>
          </div>

          <figure className="run" ref={heroRef}>
            <HeroScene />
            <figcaption>The team: a project manager, several departments, and the workers in each.</figcaption>
          </figure>
        </section>

        <section className="crew" id="crew" aria-labelledby="crew-heading">
          <h2 id="crew-heading" className="section-head" data-reveal>
            One goal, a team that works it
          </h2>
          <p className="section-lede" data-reveal>
            You talk to the assistant. Bigger work it hands to a <strong>department</strong>: a named group of
            workers with a lead. The lead splits the goal into steps, gives each step to a worker, and checks
            what comes back. The rest of the product (memory, tools, spend) sits around that loop, and
            everything below runs on your own machine.
          </p>
          <ol className="crew-steps">
            {[
              {
                h: "The lead plans",
                p: "The lead breaks the goal into steps, one per worker, with the files and results each step needs. You approve the plan, edit it, or set the autonomy so it goes ahead on its own and reports at milestones.",
              },
              {
                h: "Workers run together",
                p: "Steps that do not depend on each other run at the same time, up to a limit you choose, each on its own model or a shared one. Steps on the same model are grouped so nothing is loaded twice for nothing.",
              },
              {
                h: "Results come back checked",
                p: "The lead reads each result against its step. Small misses it fixes in place; a real failure is retried, moved to another model, done by the lead itself, or handed to another worker.",
              },
            ].map((s) => (
              <li key={s.h} data-reveal>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
          <dl className="crew-more">
            <div data-reveal>
              <dt>Nested</dt>
              <p>
                A department can hold sub-departments. A sub-department is a step that runs its own plan with
                its own lead, and its failure comes back as a failed step, so the same checks apply at every
                depth, and a stuck team cannot loop or run up cost unnoticed.
              </p>
            </div>
            <div data-reveal>
              <dt>Extended</dt>
              <p>
                A department is a Markdown file: name, lead, members, instructions. A worker is one too, with
                its model, tools and memory slice. Write them by hand, edit them in the app, or share a folder of
                them as a plugin.
              </p>
            </div>
          </dl>
        </section>

        <section className="parts" id="studio" aria-labelledby="parts-heading">
          <h2 id="parts-heading" className="section-head" data-reveal>
            The studio, and the three parts under it
          </h2>
          <ol className="part-list">
            {PARTS.map((p) => (
              <li className="part" key={p.id} data-part={p.id} data-reveal>
                <span className="part-id">{p.label}</span>
                <div className="part-body">
                  <h3>
                    <a href={p.href}>{p.name}</a>
                  </h3>
                  <p>{p.body}</p>
                </div>
                <span className="part-meta">{p.meta}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="tenets" aria-labelledby="tenets-heading">
          <h2 id="tenets-heading" className="section-head" data-reveal>
            Three things it will not do
          </h2>
          <dl className="tenet-list">
            {[
              {
                h: "Sign you in",
                p: "There is no account, no telemetry endpoint, no billing behind a key. Model calls go to the server you named, with the key you gave.",
              },
              {
                h: "Rewrite your prompt",
                p: "Learned rules, style and skills are separate blocks added after the base prompt. Every version is kept, and anything applied without asking is logged so you can undo it.",
              },
              {
                h: "Hold your keys in a file",
                p: "Secrets live in the OS store: Secret Service, Keychain, Credential Manager. The config holds a reference, never the value.",
              },
            ].map((x) => (
              <div key={x.h} data-reveal>
                <dt>{x.h}</dt>
                <dd>{x.p}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="get" aria-labelledby="get-heading">
          <h2 id="get-heading" className="section-head" data-reveal>
            Get it
          </h2>
          <p className="get-copy" data-reveal>
            Prebuilt for Linux, Windows and macOS, with a script for Linux that works out which distribution
            you are on before it installs anything.
          </p>
          <div className="hero-actions" data-reveal>
            <a className="button" href="/LastSoft/downloads.html">
              Download for your system
            </a>
            <a className="link-arrow" href="/LastSoft/docs/">
              Read the docs
            </a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>Pre-release software. Source-available, PolyForm Noncommercial 1.0.0.</span>
        <span>
          Built by <a href="https://thesyriandev.github.io/">TheSyrianDev</a> ·{" "}
          <a href="https://github.com/TheSyrianDev/LastAI">Source</a>
        </span>
      </footer>
    </>
  );
}
