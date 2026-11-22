// Fig. 1 is the team the agent builds: a project manager at the core, a
// random number of departments around it, and a random number of workers
// around each. Particles run the edges the way a goal runs through the team.

window.__lastsoftMotion = false;

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ figure */
/* The team as a 3D structure: a project manager at the core, a random number
   of departments around it, and a random number of workers around each. */
async function figure() {
  const canvas = document.getElementById("run-canvas");
  if (!canvas) return;

  let THREE;
  try {
    THREE = await import("./vendor/three.module.js");
  } catch {
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.1, 9.4);
  camera.lookAt(0, -0.1, 0);

  const read = (name, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

  /* denser sprite for the nodes themselves, so they read as thick orbs */
  const orbTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.42, "rgba(255,255,255,0.96)");
    grad.addColorStop(0.68, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  /* softer sprite for the particles travelling the edges */
  const glowTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  /* the theme's own three accents, used as gradient stops */
  const stops = [
    new THREE.Color(read("--accent", "#b2c27c")),
    new THREE.Color(read("--accent-2", "#e0a050")),
    new THREE.Color(read("--leaf", "#93a563")),
  ];
  const ramp = (t, out) => {
    const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(x), stops.length - 2);
    return out.copy(stops[i]).lerp(stops[i + 1], x - i);
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const DEPTS = 3 + Math.floor(Math.random() * 3); // 3..5 departments
  const RING = 3.1;
  const MAXD = RING + 2.1;

  const root = new THREE.Group();
  root.rotation.x = -0.34;
  root.scale.setScalar(0.55);
  scene.add(root);

  /* soft cast shadow under the whole structure, so it reads as floating */
  const shadow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: stops[0].clone(),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  shadow.scale.set(10, 2.4, 1);
  shadow.position.set(0, -2.4, -1.3);
  root.add(shadow);

  const pts = [new THREE.Vector3(0, 0, 0)];
  const ts = [0];
  const cols = [ramp(0, new THREE.Color())];
  const meshes = [];

  const addNode = (pos, size, t) => {
    pts.push(pos.clone());
    ts.push(t);
    cols.push(ramp(t, new THREE.Color()));
    const i = pts.length - 1;
    const m = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: orbTexture,
        color: cols[i].clone(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    m.position.copy(pos);
    m.scale.setScalar(size);
    root.add(m);
    meshes.push(m);
    return i;
  };

  addNode(new THREE.Vector3(0, 0, 0), 1.35, 0);

  const edges = [];

  for (let i = 0; i < DEPTS; i++) {
    const a = (i / DEPTS) * Math.PI * 2 + rand(-0.18, 0.18);
    const d = new THREE.Vector3(Math.cos(a) * RING, rand(-1.3, 1.3), Math.sin(a) * RING);
    const di = addNode(d, 0.88, 0.14 + (d.length() / MAXD) * 0.3 + rand(-0.05, 0.05));
    edges.push([0, di]);

    const workers = 1 + Math.floor(Math.random() * 3); // 1..3 workers each
    for (let w = 0; w < workers; w++) {
      const wa = (w / workers) * Math.PI * 2 + rand(-0.4, 0.4);
      const p = new THREE.Vector3(
        d.x + Math.cos(wa) * rand(1.5, 1.9),
        d.y + rand(-1.0, 1.0),
        d.z + Math.sin(wa) * rand(1.5, 1.9)
      );
      const wi = addNode(p, 0.5, 0.6 + (p.length() / (MAXD * 1.25)) * 0.38 + rand(-0.05, 0.05));
      edges.push([di, wi]);
    }
  }

  const edgePositions = [];
  const edgeColors = [];
  edges.forEach(([i, j]) => {
    edgePositions.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
    edgeColors.push(cols[i].r, cols[i].g, cols[i].b, cols[j].r, cols[j].g, cols[j].b);
  });
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(edgeColors, 3));
  root.add(
    new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );

  const particles = [];
  edges.forEach((e, i) => {
    for (let k = 0; k < 2; k++) particles.push({ e: i, t: Math.random(), s: rand(0.1, 0.26) });
  });
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(particles.length * 3), 3));
  dustGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(particles.length * 3), 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.22,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  );
  root.add(dust);

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    if (!box.width || !box.height) return;
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const scratch = new THREE.Color();
  new MutationObserver(() => {
    stops[0].set(read("--accent", "#b2c27c"));
    stops[1].set(read("--accent-2", "#e0a050"));
    stops[2].set(read("--leaf", "#93a563"));
    for (let i = 0; i < ts.length; i++) {
      ramp(ts[i], cols[i]);
      if (meshes[i]) meshes[i].material.color.copy(cols[i]);
    }
    let k = 0;
    edges.forEach(([i, j]) => {
      edgeColors[k++] = cols[i].r;
      edgeColors[k++] = cols[i].g;
      edgeColors[k++] = cols[i].b;
      edgeColors[k++] = cols[j].r;
      edgeColors[k++] = cols[j].g;
      edgeColors[k++] = cols[j].b;
    });
    edgeGeometry.attributes.color.needsUpdate = true;
    shadow.material.color.copy(cols[0]);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    root.rotation.y += dt * 0.045;
    root.position.y = Math.sin(t * 0.5) * 0.12;

    const pos = dust.geometry.attributes.position;
    const col = dust.geometry.attributes.color;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += dt * p.s;
      if (p.t > 1) p.t -= 1;
      const [a, b] = edges[p.e];
      pos.setXYZ(
        i,
        pts[a].x + (pts[b].x - pts[a].x) * p.t,
        pts[a].y + (pts[b].y - pts[a].y) * p.t,
        pts[a].z + (pts[b].z - pts[a].z) * p.t
      );
      scratch.copy(cols[a]).lerp(cols[b], p.t);
      col.setXYZ(i, scratch.r, scratch.g, scratch.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
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

figure().catch((e) => console.warn("hero scene:", e));
reveals();
copies();
