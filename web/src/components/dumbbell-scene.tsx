"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, MoveUpRight, RotateCcw } from "lucide-react";
import type * as Three from "three";

export function DumbbellScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ x: 0.3, y: -0.45 });
  const weightUpdater = useRef<((weight: number) => void) | null>(null);
  const currentWeight = useRef(10);
  const [weight, setWeight] = useState(10);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    currentWeight.current = weight;
    weightUpdater.current?.(weight);
  }, [weight]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    import("three").then(THREE => {
      if (disposed || !canvasRef.current) return;
      const canvas = canvasRef.current;
      let renderer: Three.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
      catch { setUnavailable(true); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      camera.position.set(0, 0.3, 10.5);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x566a36, 3));
      const key = new THREE.DirectionalLight(0xffffff, 6);
      key.position.set(-3, 5, 4); scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 4);
      rim.position.set(4, 1, -2); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xc5f460, 1.5);
      fill.position.set(0, -4, 2); scene.add(fill);
      const dumbbell = new THREE.Group();
      dumbbell.rotation.z = -0.45;
      scene.add(dumbbell);
      const rubber = new THREE.MeshStandardMaterial({ color: 0x181a18, roughness: 0.55, metalness: 0.15 });
      const edge = new THREE.MeshStandardMaterial({ color: 0x303430, roughness: 0.4, metalness: 0.35 });
      const metal = new THREE.MeshStandardMaterial({ color: 0xc7cdc3, roughness: 0.28, metalness: 0.65 });
      const accent = new THREE.MeshStandardMaterial({ color: 0xc5f460, roughness: 0.4, metalness: 0.1 });
      function cylinder(radius: number, length: number, x: number, material: Three.Material) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 80, 1), material);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.x = x;
        dumbbell.add(mesh);
        return mesh;
      }
      cylinder(0.135, 3.8, 0, metal);
      cylinder(0.17, 1.55, 0, metal);
      for (let i = 0; i < 29; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.009, 6, 24), edge);
        ring.rotation.y = Math.PI / 2;
        ring.position.x = -0.7 + i * 0.05;
        dumbbell.add(ring);
      }
      const plates: Three.Mesh[] = [];
      for (const side of [-1, 1]) {
        cylinder(0.3, 0.15, side * 0.87, metal);
        for (let i = 0; i < 3; i++) {
          const plate = cylinder(0.82 - i * 0.04, 0.25, side * (1.08 + i * 0.27), rubber);
          plates.push(plate);
          const bevel = new THREE.Mesh(new THREE.TorusGeometry(0.77 - i * 0.04, 0.055, 8, 64), edge);
          bevel.rotation.y = Math.PI / 2;
          bevel.position.x = side * (1.19 + i * 0.27);
          bevel.userData.isRim = true;
          dumbbell.add(bevel);
          plates.push(bevel);
        }
        cylinder(0.25, 0.1, side * 1.82, accent);
        cylinder(0.11, 0.13, side * 1.88, metal);
      }
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, "rgba(21,35,0,0.3)"); gradient.addColorStop(1, "rgba(21,35,0,0)");
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      }
      const texture = new THREE.CanvasTexture(shadowCanvas);
      const shadowMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.6), shadowMaterial);
      shadow.position.set(0, -1.65, -1);
      scene.add(shadow);
      weightUpdater.current = value => {
        const scale = value === 5 ? 0.8 : value === 15 ? 1.12 : 1;
        plates.forEach(plate => {
          if (plate.userData.isRim) plate.scale.set(scale, scale, 1);
          else plate.scale.set(scale, 1, scale);
        });
      };
      weightUpdater.current(currentWeight.current);
      let width = 0;
      const resize = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        width = parent.clientWidth;
        const height = parent.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.position.z = width < 400 ? 12 : 10.5;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(canvas.parentElement!);
      resize();
      let active = true;
      const visibility = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; });
      visibility.observe(canvas);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let frame = 0;
      let dragging = false;
      let previousX = 0;
      let previousY = 0;
      const down = (event: PointerEvent) => {
        dragging = true; previousX = event.clientX; previousY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (!dragging) return;
        rotation.current.y += (event.clientX - previousX) * 0.009;
        rotation.current.x = Math.max(-1.2, Math.min(1.2, rotation.current.x + (event.clientY - previousY) * 0.008));
        previousX = event.clientX; previousY = event.clientY;
      };
      const up = () => { dragging = false; };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      const render = (time: number) => {
        frame = requestAnimationFrame(render);
        if (!active) return;
        dumbbell.rotation.x += (rotation.current.x - dumbbell.rotation.x) * 0.12;
        dumbbell.rotation.y += (rotation.current.y - dumbbell.rotation.y) * 0.12;
        dumbbell.position.y = reducedMotion.matches || dragging ? 0 : Math.sin(time * 0.0008) * 0.08;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);
      setReady(true);
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
        canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
        scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
        rubber.dispose(); edge.dispose(); metal.dispose(); accent.dispose();
        shadowMaterial.dispose(); texture.dispose(); renderer.dispose();
        weightUpdater.current = null;
      };
    }).catch(() => { if (!disposed) setUnavailable(true); });
    return () => { disposed = true; cleanup(); };
  }, []);

  return <div className="relative flex min-h-115 flex-col overflow-hidden bg-brand sm:min-h-135 lg:min-h-145" role="group" aria-label="Interactive 3D dumbbell">
    <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
      <svg viewBox="0 0 560 570" preserveAspectRatio="xMidYMid slice" className="h-full w-full fill-none stroke-ink/15"><ellipse cx="280" cy="352" rx="224" ry="129" strokeDasharray="3 7" /><ellipse cx="280" cy="360" rx="224" ry="73" /><path d="M55 360h450M280 122v375M66 481l28-16m373 16-28-16" /><circle cx="280" cy="360" r="225" /><path d="M44 48h18m-9-9v18m436 446h18m-9-9v18" /></svg>
      <span className="absolute top-20 -right-3 text-[150px] leading-none font-semibold tracking-[-12px] text-ink/6 sm:text-[195px]">MOVE</span>
    </div>
    <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-8"><span className="text-xs font-semibold tracking-[0.15em]">BUILT FOR YOUR NEXT REP</span><MoveUpRight size={23} strokeWidth={1.4} /></div>
    <div className="relative min-h-77 flex-1 sm:min-h-91">
      <canvas ref={canvasRef} className={`absolute inset-0 size-full touch-none cursor-grab active:cursor-grabbing ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      {!ready && <svg viewBox="0 0 500 360" className="absolute inset-0 size-full" aria-hidden="true"><g transform="rotate(-28 250 180)" stroke="#292d23" strokeWidth="3"><path d="M145 167h210v27H145z" fill="#dce0d2" /><g fill="#1e221b"><rect x="118" y="111" width="45" height="142" rx="12" /><rect x="86" y="122" width="35" height="120" rx="9" /><rect x="337" y="111" width="45" height="142" rx="12" /><rect x="382" y="122" width="35" height="120" rx="9" /></g><path d="M122 123v115m220-115v115M177 168v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23" stroke="#646c5c" strokeWidth="1" /></g></svg>}
    </div>
    <div className="relative z-10 px-6 pb-6 sm:px-8 sm:pb-8">
      <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-medium text-ink/60">YOUR PACE. YOUR WEIGHT.</p><p className="mt-1 text-4xl leading-none font-semibold tracking-[-1.5px]" aria-live="polite">{String(weight).padStart(2, "0")}<span className="ml-1.5 text-lg font-medium tracking-normal">kg</span></p></div><div className="flex gap-1.5" aria-label="Choose dumbbell weight">{[5, 10, 15].map(value => <button key={value} onClick={() => setWeight(value)} aria-pressed={weight === value} className={`flex size-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${value === weight ? "border-ink bg-ink text-brand" : "border-ink/25 hover:border-ink hover:bg-ink/5"}`}>{String(value).padStart(2, "0")}</button>)}</div></div>
      <div className="flex items-center justify-between border-t border-ink/20 pt-4"><p className="text-xs text-ink/65">{unavailable ? "Your next rep, visualized." : "Go on, drag to explore."}</p><div className="flex items-center gap-1"><button disabled={!ready} aria-label="Rotate dumbbell left" onClick={() => { rotation.current.y -= 0.5; }} className="rounded-full p-2 transition-colors hover:bg-ink/10"><ArrowLeft size={16} /></button><button disabled={!ready} aria-label="Reset dumbbell view" onClick={() => { rotation.current = { x: 0.3, y: -0.45 }; }} className="rounded-full p-2 transition-colors hover:bg-ink/10"><RotateCcw size={15} /></button><button disabled={!ready} aria-label="Rotate dumbbell right" onClick={() => { rotation.current.y += 0.5; }} className="rounded-full p-2 transition-colors hover:bg-ink/10"><ArrowRight size={16} /></button></div></div>
    </div>
  </div>;
}
