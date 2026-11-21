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
  camera.position.set(0, 2.0, 9.2);
  camera.lookAt(0, -0.2, 0);

  const root = new THREE.Group();
  root.rotation.x = -0.42;
  scene.add(root);

  const read = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const materials = {
    core: new THREE.MeshBasicMaterial({ color: read("--accent", "#b2c27c") }),
    dept: new THREE.MeshBasicMaterial({ color: read("--accent-2", "#e0a050") }),
    leaf: new THREE.MeshBasicMaterial({ color: read("--leaf", "#93a563") }),
    edge: new THREE.LineBasicMaterial({ color: read("--ink", "#ece6d7"), transparent: true, opacity: 0.2 }),
    dust: new THREE.PointsMaterial({
      color: read("--accent", "#b2c27c"),
      size: 0.06,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const DEPTS = 3 + Math.floor(Math.random() * 4); // 3..6 departments
  const RING = 2.2;

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), materials.core);
  root.add(core);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 32),
    new THREE.MeshBasicMaterial({ color: read("--accent", "#b2c27c"), transparent: true, opacity: 0.13 })
  );
  root.add(halo);

  const edges = [];

  for (let i = 0; i < DEPTS; i++) {
    const a = (i / DEPTS) * Math.PI * 2 + rand(-0.14, 0.14);
    const d = new THREE.Vector3(Math.cos(a) * RING, rand(-1.0, 1.0), Math.sin(a) * RING);
    const dept = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), materials.dept);
    dept.position.copy(d);
    root.add(dept);
    edges.push([new THREE.Vector3(0, 0, 0), d]);

    const workers = 1 + Math.floor(Math.random() * 5); // 1..5 workers each
    for (let w = 0; w < workers; w++) {
      const wa = (w / workers) * Math.PI * 2 + rand(-0.35, 0.35);
      const p = new THREE.Vector3(
        d.x + Math.cos(wa) * rand(0.85, 1.1),
        d.y + rand(-0.75, 0.75),
        d.z + Math.sin(wa) * rand(0.95, 1.3)
      );
      const worker = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), materials.leaf);
      worker.position.copy(p);
      root.add(worker);
      edges.push([d, p]);
    }
  }

  const edgePositions = [];
  edges.forEach(([a, b]) => edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z));
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  root.add(new THREE.LineSegments(edgeGeometry, materials.edge));

  const particles = [];
  edges.forEach((e, i) => {
    for (let k = 0; k < 2; k++) particles.push({ e: i, t: Math.random(), s: rand(0.1, 0.28) });
  });
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(particles.length * 3), 3));
  const dust = new THREE.Points(dustGeo, materials.dust);
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

  new MutationObserver(() => {
    materials.core.color.set(read("--accent", "#b2c27c"));
    materials.dept.color.set(read("--accent-2", "#e0a050"));
    materials.leaf.color.set(read("--leaf", "#93a563"));
    materials.edge.color.set(read("--ink", "#ece6d7"));
    materials.dust.color.set(read("--accent", "#b2c27c"));
    halo.material.color.set(read("--accent", "#b2c27c"));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    root.rotation.y += dt * 0.16;
    root.position.y = Math.sin(t * 0.5) * 0.06;
    core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.045);

    const pos = dust.geometry.attributes.position;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += dt * p.s;
      if (p.t > 1) p.t -= 1;
      const [a, b] = edges[p.e];
      pos.setXYZ(i, a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, a.z + (b.z - a.z) * p.t);
    }
    pos.needsUpdate = true;

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
