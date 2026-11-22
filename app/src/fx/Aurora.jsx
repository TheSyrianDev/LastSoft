import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-screen GLSL aurora: domain-warped fbm noise in the theme's three accent
 * colours, with a pool of light that follows the pointer.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.3;
  float t = uTime * 0.012;

  vec2 q = vec2(fbm(p + t), fbm(p - t + 4.3));
  vec2 r = vec2(
    fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.16 * t),
    fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.13 * t)
  );
  float f = fbm(p + 2.4 * r);

  vec3 col = mix(uA, uB, clamp(length(q) * 1.35, 0.0, 1.0));
  col = mix(col, uC, clamp(length(r) * 1.15, 0.0, 1.0));
  col *= 0.16 + 0.42 * f;

  float d = length((uv - uPointer) * vec2(aspect, 1.0));
  col += uC * 0.14 * smoothstep(0.55, 0.0, d);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function Aurora() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uA: { value: new THREE.Color("#b2c27c") },
      uB: { value: new THREE.Color("#e0a050") },
      uC: { value: new THREE.Color("#93a563") },
    };
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
    );
    scene.add(mesh);

    const read = (n, f) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
    const applyTheme = () => {
      uniforms.uA.value.set(read("--accent", "#b2c27c"));
      uniforms.uB.value.set(read("--accent-2", "#e0a050"));
      uniforms.uC.value.set(read("--leaf", "#93a563"));
    };
    applyTheme();

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: 0.5, y: 0.5 };
    const onMove = (e) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf;
    const clock = new THREE.Clock();
    const loop = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uPointer.value.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.06);
      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      observer.disconnect();
      renderer.dispose();
    };
  }, []);

  return <canvas id="fx" ref={ref} aria-hidden="true" />;
}
