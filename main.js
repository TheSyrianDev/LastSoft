// Fig. 1 is the thing the product actually is: a core, the departments under
// it, the workers in those departments, and the two parts that feed it — the
// engine around the outside and the downloader below. Particles run the edges
// the way a goal runs through the team.

window.__lastsoftMotion = false;

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ scene */
async function figure() {
  const canvas = document.getElementById("figure-canvas");
  const frame = canvas?.parentElement;
  if (!canvas || !frame) return;

  let THREE;
  try {
    THREE = await import("three");
  } catch {
    canvas.style.display = "none";
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.style.display = "none";
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const VIEW = 6.4;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -40, 60);
  camera.position.set(3.9, 3.1, 5.6);
  camera.lookAt(0, -0.1, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  // The scene takes its colours from the page's tokens, so Fig. 1 follows the
  // theme like everything else; `lastai:theme` re-reads them on a swap.
  const palette = () => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => new THREE.Color(styles.getPropertyValue(name).trim() || fallback);
    return {
      ink: read("--ink", "#ece6d7"),
      accent: read("--accent", "#b2c27c"),
      second: read("--accent-2", "#e0a050"),
      leaf: read("--leaf", "#93a563"),
    };
  };
  let colours = palette();
  const themed = [];
  const tint = (material, key) => {
    material.color.copy(colours[key]);
    themed.push([material, key]);
    return material;
  };

  const sphere = new THREE.SphereGeometry(1, 14, 12);
  const dot = (color, radius, opacity = 1) => {
    const mesh = new THREE.Mesh(
      sphere,
      new THREE.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity })
    );
    mesh.scale.setScalar(radius);
    return mesh;
  };

  /* ------------------------------------------------------------- the team */
  const DEPTS = 4;
  const WORKERS = 4;
  const RING = 1.62;
  const SPREAD = 0.92;

  const team = new THREE.Group();
  rig.add(team);

  const core = dot(colours.accent, 0.19);
  team.add(core);

  // a soft halo so the hub reads as the source of the work
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 16),
    tint(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      "accent"
    )
  );
  halo.scale.setScalar(0.52);
  team.add(halo);

  const depts = [];
  const workers = [];
  const edges = []; // { from:Vector3, to:Vector3 }

  // departments sit on a sphere around the core, not on a disc: the shape reads
  // as a body with limbs from any angle
  const DEPT_DIRS = [
    [0.0, 0.95, 0.3],
    [0.9, 0.1, -0.42],
    [-0.55, -0.25, 0.78],
    [-0.35, -0.8, -0.5],
  ];

  for (let d = 0; d < DEPTS; d++) {
    const dir = new THREE.Vector3(...DEPT_DIRS[d]).normalize();
    const center = dir.clone().multiplyScalar(RING);

    const node = dot(colours.ink, 0.11, 0.95);
    node.position.copy(center);
    node.userData.phase = d * 1.7;
    node.userData.dir = dir.clone();
    depts.push(node);
    team.add(node);

    edges.push({ from: new THREE.Vector3(0, 0, 0), to: center.clone() });

    for (let w = 0; w < WORKERS; w++) {
      // fan the workers out around the department's own axis
      const tangent = new THREE.Vector3(0, 1, 0).cross(dir);
      if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
      tangent.normalize();
      const bitangent = dir.clone().cross(tangent).normalize();

      const a = (w / WORKERS) * Math.PI * 2 + d * 0.9;
      const pos = center
        .clone()
        .add(tangent.clone().multiplyScalar(Math.cos(a) * SPREAD))
        .add(bitangent.clone().multiplyScalar(Math.sin(a) * SPREAD))
        .add(dir.clone().multiplyScalar(0.22));

      const worker = dot(colours.leaf, 0.062, 0.9);
      worker.position.copy(pos);
      worker.userData.phase = d * 1.7 + w * 0.9;
      workers.push(worker);
      team.add(worker);

      edges.push({ from: center.clone(), to: pos.clone() });
    }
  }

  // the harness's own wiring
  const edgeGeometry = new THREE.BufferGeometry();
  const edgePositions = new Float32Array(edges.length * 6);
  edges.forEach((e, i) => {
    edgePositions.set([e.from.x, e.from.y, e.from.z, e.to.x, e.to.y, e.to.z], i * 6);
  });
  edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
  const edgeLines = new THREE.LineSegments(
    edgeGeometry,
    tint(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 }), "ink")
  );
  rig.add(edgeLines);

  // what runs along the wiring
  const flowCount = edges.length;
  const flowGeometry = new THREE.BufferGeometry();
  const flowPositions = new Float32Array(flowCount * 3);
  flowGeometry.setAttribute("position", new THREE.BufferAttribute(flowPositions, 3));
  const flow = new THREE.Points(
    flowGeometry,
    tint(new THREE.PointsMaterial({ size: 0.085, transparent: true, opacity: 0.95 }), "second")
  );
  rig.add(flow);

  /* --------------------------------------------------------- the engine */
  const engine = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.02, 0.012, 3, 120),
    tint(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 }), "ink")
  );
  ring.rotation.x = Math.PI / 2;
  engine.add(ring);

  const ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.005, 3, 120),
    tint(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16 }), "ink")
  );
  ringInner.rotation.x = Math.PI / 2;
  engine.add(ringInner);

  // four ticks, where the ring is measured
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.006, 0.006),
      tint(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 }), "second")
    );
    tick.position.set(Math.cos(a) * 3.02, 0, Math.sin(a) * 3.02);
    tick.rotation.y = -a;
    engine.add(tick);
  }

  engine.rotation.z = 0.16;
  engine.position.y = -0.05;
  rig.add(engine);

  /* ------------------------------------------------------ the downloader */
  const feed = new THREE.Group();
  const feedNode = dot(colours.second, 0.075, 1);
  feedNode.position.set(0, -2.15, 0);
  feed.add(feedNode);

  const feedEdge = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.15, 0),
      new THREE.Vector3(0, 0, 0),
    ]),
    tint(
      new THREE.LineDashedMaterial({
        dashSize: 0.07,
        gapSize: 0.09,
        transparent: true,
        opacity: 0.45,
      }),
      "second"
    )
  );
  feedEdge.computeLineDistances();
  feed.add(feedEdge);
  rig.add(feed);

  /* -------------------------------------------------------------- sizing */
  function resize() {
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    const aspect = rect.width / rect.height;
    camera.left = (-VIEW * aspect) / 2;
    camera.right = (VIEW * aspect) / 2;
    camera.top = VIEW / 2;
    camera.bottom = -VIEW / 2;
    camera.updateProjectionMatrix();
  }

  resize();
  new ResizeObserver(resize).observe(frame);

  document.addEventListener("lastai:theme", () => {
    colours = palette();
    for (const [material, key] of themed) material.color.copy(colours[key]);
  });

  /* -------------------------------------------------------- hover wiring */
  const rows = [...document.querySelectorAll(".part[data-part]")];

  const GROUPS = {
    ai: ["team", "engine", "feed"],
    lh: ["team"],
    engine: ["engine"],
    hfd: ["feed"],
  };

  const level = { team: 0, engine: 0, feed: 0 };
  const levelTarget = { team: 0, engine: 0, feed: 0 };

  function setActive(key, on) {
    for (const name of Object.keys(levelTarget)) {
      levelTarget[name] = on && GROUPS[key]?.includes(name) ? 1 : 0;
    }
    for (const row of rows) row.dataset.active = String(row.dataset.part === key && on);
  }

  for (const row of rows) {
    const key = row.dataset.part;
    row.addEventListener("pointerenter", () => setActive(key, true));
    row.addEventListener("pointerleave", () => setActive(key, false));
    row.addEventListener("focusin", () => setActive(key, true));
    row.addEventListener("focusout", () => setActive(key, false));
  }

  /* ------------------------------------------------------------- pointer */
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  frame.addEventListener("pointermove", (event) => {
    const rect = frame.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
  });

  frame.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  /* ---------------------------------------------------------------- loop */
  const positions = flowGeometry.getAttribute("position");
  let introStart = 0;
  let visible = true;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible) return;

    if (!introStart) introStart = now;
    const elapsed = (now - introStart) / 1000;
    const born = Math.min(1, elapsed / 1.1);

    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;

    if (!reduce) {
      rig.rotation.y = Math.sin(elapsed * 0.12) * 0.22 + eased.x * 0.45;
    }
    rig.rotation.x = 0.03 + eased.y * 0.12;

    for (const name of Object.keys(level)) level[name] += (levelTarget[name] - level[name]) * 0.14;

    const lift = 1 + level.team * 0.06;

    halo.scale.setScalar((0.5 + Math.sin(elapsed * 1.1) * 0.035) * born);
    core.scale.setScalar(0.21 * born * (1 + Math.sin(elapsed * 1.6) * 0.05) * lift);
    for (const node of depts) {
      const s = 0.11 * born * lift * (1 + Math.sin(elapsed * 1.1 + node.userData.phase) * 0.06);
      node.scale.setScalar(s);
      node.material.color.copy(level.team ? colours.accent : colours.ink);
      node.material.opacity = 0.95 * born * (level.team ? 1 : level.engine || level.feed ? 0.28 : 0.95);
    }
    for (const node of workers) {
      const s = 0.062 * born * lift;
      node.scale.setScalar(s);
      node.material.color.copy(level.team ? colours.accent : colours.leaf);
      node.material.opacity = 0.9 * born * (level.team ? 1 : level.engine || level.feed ? 0.18 : 0.9);
    }

    core.material.color.copy(level.team ? colours.ink : colours.accent);
    edgeLines.material.opacity =
      (level.team ? 0.45 : level.engine || level.feed ? 0.08 : 0.22) * born;

    ring.material.opacity = 0.3 * born * (level.engine ? 3 : 1);
    ring.material.color.copy(level.engine ? colours.accent : colours.ink);
    ringInner.material.opacity = 0.16 * born * (level.engine ? 2.6 : 1);
    engine.scale.setScalar(1 + level.engine * 0.02);
    engine.children.slice(2).forEach((tickMesh) => {
      tickMesh.material.opacity = 0.55 * born * (level.engine ? 1.4 : 1);
    });

    feedNode.material.color.copy(level.feed ? colours.accent : colours.second);
    feedEdge.material.opacity = 0.45 * born * (level.feed ? 1.6 : 1);
    feedEdge.material.color.copy(level.feed ? colours.accent : colours.second);
    feed.scale.setScalar(1 + level.feed * 0.05);

    // the work, running from the core out to the workers
    if (born > 0.98) {
      for (let i = 0; i < flowCount; i++) {
        const e = edges[i];
        const t = reduce ? 1 : ((elapsed * 0.22 + i * 0.137) % 1);
        positions.setXYZ(
          i,
          e.from.x + (e.to.x - e.from.x) * t,
          e.from.y + (e.to.y - e.from.y) * t,
          e.from.z + (e.to.z - e.from.z) * t
        );
      }
      positions.needsUpdate = true;
      flow.material.opacity = (level.team ? 1 : level.engine || level.feed ? 0.25 : 0.85) * born;
    }

    renderer.render(scene, camera);
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }, { threshold: 0.01 });
  io.observe(frame);

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
  });

  requestAnimationFrame(tick);
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

figure();
reveals();
copies();
