import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The layer above the content: a curl-noise field of short streaks stirred by
 * the pointer, plus the cursor orb with its trail and click pulse.
 */
export default function Field() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
    camera.position.set(0, 0, 30);

    const read = (n, f) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
    const ground = new THREE.Color(read("--ground", "#0b120e"));
    const accent = new THREE.Color(read("--accent", "#b2c27c"));
    const tint = new THREE.Color();

    const sprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.5)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    /* ------------------------------------------------------------ streaks */
    const COUNT = 300;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pos = new Float32Array(COUNT * 3);
    const prev = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = rand(-1, 1);
      pos[i * 3 + 1] = rand(-1, 1);
      pos[i * 3 + 2] = rand(-0.3, 0.3);
      seeds[i] = rand(0.7, 1.8);
    }
    const linePos = new Float32Array(COUNT * 6);
    const lineCol = new Float32Array(COUNT * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    scene.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    const field = (x, y, t) =>
      Math.sin(x * 0.0035 + t * 0.06) * Math.cos(y * 0.0031 - t * 0.05) +
      0.55 * Math.sin((x + y) * 0.0019 + t * 0.03);

    /* --------------------------------------------------------------- orb */
    const orb = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 24),
      new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.9 })
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sprite,
        color: accent.clone(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    halo.scale.setScalar(2.4);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.525, 48),
      new THREE.MeshBasicMaterial({
        color: accent.clone(),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    orb.add(core, halo, ring);
    scene.add(orb);

    const TRAIL = 46;
    const trailPos = new Float32Array(TRAIL * 3);
    const trailCol = new Float32Array(TRAIL * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailCol, 3));
    scene.add(
      new THREE.Line(
        trailGeo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      )
    );

    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.27, 40),
      new THREE.MeshBasicMaterial({
        color: accent.clone(),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    scene.add(pulse);

    let halfW = 20;
    let halfH = 12;
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      halfW = halfH * camera.aspect;
    };
    resize();
    window.addEventListener("resize", resize);

    const pointer = { tx: 0, ty: 0, x: 0, y: 0, moved: 0 };
    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.moved = performance.now();
    };
    const onDown = () => {
      pulseT = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    const observer = new MutationObserver(() => {
      ground.set(read("--ground", "#0b120e"));
      accent.set(read("--accent", "#b2c27c"));
      core.material.color.copy(accent);
      halo.material.color.copy(accent);
      ring.material.color.copy(accent);
      pulse.material.color.copy(accent);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    const target = new THREE.Vector3();
    let pulseT = 1;
    const clock = new THREE.Clock();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      const px = pointer.x * halfW;
      const py = pointer.y * halfH;

      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const nx = pos[ix];
        const ny = pos[ix + 1];
        const ang = field(nx, ny, t) * Math.PI;
        let vx = Math.cos(ang);
        let vy = Math.sin(ang);
        const dx = nx * halfW - px;
        const dy = ny * halfH - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 5.6) * 2.4;
          vx += (-dy / d) * f + (dx / d) * f * 0.35;
          vy += (dx / d) * f + (dy / d) * f * 0.35;
        }
        prev[ix] = nx;
        prev[ix + 1] = ny;
        const sp = seeds[i];
        let X = nx + vx * sp * 0.018;
        let Y = ny + vy * sp * 0.018;
        if (X < -1.06) X = 1.06;
        else if (X > 1.06) X = -1.06;
        if (Y < -1.06) Y = 1.06;
        else if (Y > 1.06) Y = -1.06;
        pos[ix] = X;
        pos[ix + 1] = Y;

        const o = i * 6;
        linePos[o] = prev[ix] * halfW;
        linePos[o + 1] = prev[ix + 1] * halfH;
        linePos[o + 2] = pos[ix + 2] * 4;
        linePos[o + 3] = X * halfW;
        linePos[o + 4] = Y * halfH;
        linePos[o + 5] = pos[ix + 2] * 4;

        const glow = Math.max(0, 1 - Math.sqrt(d2) / 7);
        tint.copy(ground).lerp(accent, 0.62 + glow * 0.38);
        lineCol[o] = tint.r;
        lineCol[o + 1] = tint.g;
        lineCol[o + 2] = tint.b;
        lineCol[o + 3] = tint.r;
        lineCol[o + 4] = tint.g;
        lineCol[o + 5] = tint.b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      if (performance.now() - pointer.moved > 2600) {
        target.set(
          Math.sin(t * 0.55) * halfW * 0.42,
          Math.cos(t * 0.8) * halfH * 0.4,
          Math.sin(t * 0.4) * 2.5
        );
      } else {
        target.set(pointer.tx * halfW, pointer.ty * halfH, Math.sin(t * 1.3) * 0.6);
      }
      orb.position.lerp(target, 0.14);

      for (let i = TRAIL - 1; i > 0; i--) {
        trailPos[i * 3] = trailPos[(i - 1) * 3];
        trailPos[i * 3 + 1] = trailPos[(i - 1) * 3 + 1];
        trailPos[i * 3 + 2] = trailPos[(i - 1) * 3 + 2];
      }
      trailPos[0] = orb.position.x;
      trailPos[1] = orb.position.y;
      trailPos[2] = orb.position.z;
      for (let i = 0; i < TRAIL; i++) {
        const k = 1 - i / TRAIL;
        tint.copy(ground).lerp(accent, k);
        trailCol[i * 3] = tint.r;
        trailCol[i * 3 + 1] = tint.g;
        trailCol[i * 3 + 2] = tint.b;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;

      if (pulseT < 1) {
        pulseT = Math.min(1, pulseT + 0.022);
        pulse.position.copy(orb.position);
        pulse.scale.setScalar(1 + pulseT * 16);
        pulse.material.opacity = (1 - pulseT) * 0.55;
      } else {
        pulse.material.opacity = 0;
      }

      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    let raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      observer.disconnect();
      renderer.dispose();
    };
  }, []);

  return <canvas id="fx-cursor" ref={ref} aria-hidden="true" />;
}
