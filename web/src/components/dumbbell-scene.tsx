"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import type * as Three from "three";

const initialRotation = { x: 0.28, y: -0.48 };

export function DumbbellScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ ...initialRotation });
  const weightUpdater = useRef<((weight: number) => void) | null>(null);
  const requestRender = useRef<(() => void) | null>(null);
  const currentWeight = useRef(10);
  const paused = useRef(false);
  const hintId = useId();
  const [weight, setWeight] = useState(10);
  const [motionPaused, setMotionPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    currentWeight.current = weight;
    weightUpdater.current?.(weight);
    requestRender.current?.();
  }, [weight]);

  useEffect(() => {
    paused.current = motionPaused;
    requestRender.current?.();
  }, [motionPaused]);

  useEffect(() => {
    let disposed = false;
    let released = false;
    let frame = 0;
    let renderer: Three.WebGLRenderer | undefined;
    const geometries = new Set<Three.BufferGeometry>();
    const materials = new Set<Three.Material>();
    const textures = new Set<Three.Texture>();
    const listeners: Array<() => void> = [];

    const cleanup = () => {
      if (released) return;
      released = true;
      cancelAnimationFrame(frame);
      listeners.forEach((remove) => remove());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer?.dispose();
      weightUpdater.current = null;
      requestRender.current = null;
    };

    import("three")
      .then((THREE) => {
        const canvas = canvasRef.current;
        if (disposed || !canvas) return;

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        const studioRenderer = renderer;
        studioRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        studioRenderer.setClearColor(0x121a10, 0);
        studioRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        studioRenderer.toneMappingExposure = 1.25;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
        camera.position.set(0, 0.25, 9.3);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.HemisphereLight(0xd5e7c8, 0x111a0e, 2.8));
        const key = new THREE.DirectionalLight(0xf8ffe9, 5.5);
        key.position.set(-3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xc5f460, 4.5);
        rim.position.set(4, 2, -2);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xb5c9d3, 2.2);
        fill.position.set(2, -2, 4);
        scene.add(fill);

        const dumbbell = new THREE.Group();
        dumbbell.rotation.set(initialRotation.x, initialRotation.y, -0.4);
        scene.add(dumbbell);

        const rubber = new THREE.MeshStandardMaterial({
          color: 0x30392e,
          roughness: 0.67,
          metalness: 0.15,
        });
        const edge = new THREE.MeshStandardMaterial({
          color: 0x4b5745,
          roughness: 0.4,
          metalness: 0.5,
        });
        const metal = new THREE.MeshStandardMaterial({
          color: 0xc7d0c2,
          roughness: 0.24,
          metalness: 0.82,
        });
        const accent = new THREE.MeshStandardMaterial({
          color: 0xc5f460,
          roughness: 0.4,
          metalness: 0.3,
          emissive: 0x6b9123,
          emissiveIntensity: 0.15,
        });
        [rubber, edge, metal, accent].forEach((material) => materials.add(material));

        function mesh(geometry: Three.BufferGeometry, material: Three.Material) {
          geometries.add(geometry);
          return new THREE.Mesh(geometry, material);
        }

        function cylinder(radius: number, length: number, x: number, material: Three.Material) {
          const part = mesh(new THREE.CylinderGeometry(radius, radius, length, 64), material);
          part.rotation.z = Math.PI / 2;
          part.position.x = x;
          dumbbell.add(part);
          return part;
        }

        cylinder(0.135, 3.8, 0, metal);
        cylinder(0.17, 1.55, 0, metal);
        for (let index = 0; index < 29; index++) {
          const ring = mesh(new THREE.TorusGeometry(0.172, 0.009, 6, 24), edge);
          ring.rotation.y = Math.PI / 2;
          ring.position.x = -0.7 + index * 0.05;
          dumbbell.add(ring);
        }

        const plates: Array<{ object: Three.Mesh; ring: boolean }> = [];
        for (const side of [-1, 1]) {
          cylinder(0.3, 0.15, side * 0.87, metal);
          cylinder(0.31, 0.045, side * 0.94, accent);
          for (let index = 0; index < 3; index++) {
            const plate = cylinder(0.82 - index * 0.04, 0.25, side * (1.08 + index * 0.27), rubber);
            plates.push({ object: plate, ring: false });
            const bevel = mesh(new THREE.TorusGeometry(0.77 - index * 0.04, 0.045, 8, 64), edge);
            bevel.rotation.y = Math.PI / 2;
            bevel.position.x = side * (1.19 + index * 0.27);
            dumbbell.add(bevel);
            plates.push({ object: bevel, ring: true });
          }
          cylinder(0.26, 0.075, side * 1.82, accent);
          cylinder(0.12, 0.13, side * 1.88, metal);
        }

        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = shadowCanvas.height = 128;
        const context = shadowCanvas.getContext("2d");
        if (context) {
          const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
          gradient.addColorStop(0, "rgba(0,0,0,0.7)");
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          context.fillStyle = gradient;
          context.fillRect(0, 0, 128, 128);
        }
        const texture = new THREE.CanvasTexture(shadowCanvas);
        textures.add(texture);
        const shadowMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        });
        materials.add(shadowMaterial);
        const shadow = mesh(new THREE.PlaneGeometry(6, 1.3), shadowMaterial);
        shadow.position.set(0, -1.5, -1.2);
        scene.add(shadow);

        weightUpdater.current = (value) => {
          const scale = value === 5 ? 0.8 : value === 15 ? 1.14 : 1;
          plates.forEach(({ object, ring }) => {
            if (ring) object.scale.set(scale, scale, 1);
            else object.scale.set(scale, 1, scale);
          });
        };
        weightUpdater.current(currentWeight.current);

        let visible = true;
        let dragging = false;
        let activePointer: number | null = null;
        let previousX = 0;
        let previousY = 0;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const canRender = () => !disposed && !released && visible && !document.hidden;
        const scheduleRender = () => {
          if (!frame && canRender()) frame = requestAnimationFrame(render);
        };
        const render = (time: number) => {
          frame = 0;
          if (!canRender()) return;
          const smoothing = reducedMotion.matches ? 1 : 0.13;
          dumbbell.rotation.x += (rotation.current.x - dumbbell.rotation.x) * smoothing;
          dumbbell.rotation.y += (rotation.current.y - dumbbell.rotation.y) * smoothing;
          const idleMotion = !reducedMotion.matches && !paused.current && !dragging;
          dumbbell.position.y = idleMotion ? Math.sin(time * 0.0008) * 0.055 : 0;
          studioRenderer.render(scene, camera);
          const settling =
            Math.abs(rotation.current.x - dumbbell.rotation.x) +
              Math.abs(rotation.current.y - dumbbell.rotation.y) >
            0.001;
          if (idleMotion || settling) scheduleRender();
        };
        requestRender.current = scheduleRender;

        const resize = () => {
          const parent = canvas.parentElement;
          if (!parent) return;
          const width = Math.max(parent.clientWidth, 1);
          const height = Math.max(parent.clientHeight, 1);
          studioRenderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = width < 400 ? 11 : 9.3;
          camera.updateProjectionMatrix();
          scheduleRender();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas.parentElement!);
        listeners.push(() => observer.disconnect());

        const visibility = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) scheduleRender();
          else {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        visibility.observe(canvas);
        listeners.push(() => visibility.disconnect());

        const down = (event: PointerEvent) => {
          if (activePointer !== null || (event.pointerType === "mouse" && event.button !== 0))
            return;
          dragging = true;
          activePointer = event.pointerId;
          previousX = event.clientX;
          previousY = event.clientY;
          canvas.setPointerCapture(event.pointerId);
          scheduleRender();
        };
        const move = (event: PointerEvent) => {
          if (!dragging || activePointer !== event.pointerId) return;
          rotation.current.y += (event.clientX - previousX) * 0.009;
          rotation.current.x = Math.max(
            -1.2,
            Math.min(1.2, rotation.current.x + (event.clientY - previousY) * 0.008),
          );
          previousX = event.clientX;
          previousY = event.clientY;
          scheduleRender();
        };
        const up = (event: PointerEvent) => {
          if (activePointer !== event.pointerId) return;
          dragging = false;
          activePointer = null;
          if (canvas.hasPointerCapture(event.pointerId))
            canvas.releasePointerCapture(event.pointerId);
          scheduleRender();
        };
        const contextLost = (event: Event) => {
          event.preventDefault();
          cleanup();
          setReady(false);
          setUnavailable(true);
        };
        const documentVisibility = () => {
          if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
          } else scheduleRender();
        };

        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);
        canvas.addEventListener("lostpointercapture", up);
        canvas.addEventListener("webglcontextlost", contextLost);
        document.addEventListener("visibilitychange", documentVisibility);
        reducedMotion.addEventListener("change", scheduleRender);
        listeners.push(() => {
          canvas.removeEventListener("pointerdown", down);
          canvas.removeEventListener("pointermove", move);
          canvas.removeEventListener("pointerup", up);
          canvas.removeEventListener("pointercancel", up);
          canvas.removeEventListener("lostpointercapture", up);
          canvas.removeEventListener("webglcontextlost", contextLost);
          document.removeEventListener("visibilitychange", documentVisibility);
          reducedMotion.removeEventListener("change", scheduleRender);
        });

        resize();
        setReady(true);
      })
      .catch(() => {
        cleanup();
        if (!disposed) {
          setReady(false);
          setUnavailable(true);
        }
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const rotate = (amount: number) => {
    rotation.current.y += amount;
    requestRender.current?.();
  };

  const reset = () => {
    rotation.current = { ...initialRotation };
    requestRender.current?.();
  };

  const controlClass =
    "flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-brand/50 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-default disabled:opacity-30";

  return (
    <div
      className="relative flex min-h-125 flex-col overflow-hidden border border-line bg-[#121a10] text-ink sm:min-h-135"
      role="group"
      aria-label="Interactive dumbbell studio"
    >
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <svg
          viewBox="0 0 550 540"
          preserveAspectRatio="xMidYMid slice"
          className="size-full fill-none stroke-brand/12"
          strokeWidth="0.7"
        >
          <circle cx="275" cy="257" r="205" strokeDasharray="2 8" />
          <circle cx="275" cy="257" r="170" />
          <ellipse cx="275" cy="274" rx="227" ry="93" transform="rotate(-24 275 274)" />
          <path d="M275 57v30m0 340v30M52 257h29m388 0h29M113 95l12 12m300 300 12 12M113 419l12-12m300-300 12-12" />
          <path
            d="M40 78V40h38m394 0h38v38M40 462v38h38m394 0h38v-38"
            className="stroke-brand/25"
          />
        </svg>
        <span className="absolute top-24 left-1/2 -translate-x-1/2 text-[100px] leading-none font-semibold tracking-[-0.08em] text-brand/4 sm:text-[140px]">
          STRENGTH
        </span>
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center border border-brand/30 font-mono text-[10px] text-brand">
            01
          </span>
          <p className="text-[10px] font-medium tracking-[0.16em] text-ink/65">THE WEIGHT ROOM</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            {unavailable ? "FORM STUDY" : "LIVE 3D"}
          </span>
          <button
            disabled={!ready}
            aria-label={motionPaused ? "Resume gentle motion" : "Pause gentle motion"}
            aria-pressed={motionPaused}
            onClick={() => setMotionPaused((value) => !value)}
            className="flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-brand/50 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:opacity-30"
          >
            {motionPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
      </div>

      <div className="relative min-h-70 flex-1 sm:min-h-78">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 size-full touch-none cursor-grab focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-brand/60 active:cursor-grabbing ${ready ? "opacity-100" : "opacity-0"}`}
          tabIndex={ready ? 0 : -1}
          role="img"
          aria-label="Rotatable three-dimensional dumbbell. Use the arrow keys to rotate, or Home to reset."
          aria-describedby={hintId}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key))
              return;
            event.preventDefault();
            if (event.key === "ArrowLeft") rotate(-0.3);
            else if (event.key === "ArrowRight") rotate(0.3);
            else if (event.key === "Home") reset();
            else {
              rotation.current.x = Math.max(
                -1.2,
                Math.min(1.2, rotation.current.x + (event.key === "ArrowUp" ? -0.2 : 0.2)),
              );
              requestRender.current?.();
            }
          }}
        />
        {!ready && (
          <svg viewBox="0 0 500 310" className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <linearGradient id={`${hintId}-metal`} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#d4ddce" />
                <stop offset="0.4" stopColor="#68785d" />
                <stop offset="1" stopColor="#b1bda9" />
              </linearGradient>
            </defs>
            <g transform="rotate(-24 250 155)" stroke="#65765a" strokeWidth="1.5">
              <path d="M127 141h246v29H127z" fill={`url(#${hintId}-metal)`} />
              <g fill="#222e1e">
                <rect x="119" y="82" width="43" height="148" rx="10" />
                <rect x="85" y="94" width="35" height="124" rx="8" />
                <rect x="338" y="82" width="43" height="148" rx="10" />
                <rect x="381" y="94" width="35" height="124" rx="8" />
              </g>
              <path
                d="M128 96v120m220-120v120M178 142v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27m8-27v27"
                stroke="#87957d"
                strokeWidth="0.75"
              />
              <path d="M78 136v39m345-39v39" stroke="#c5f460" strokeWidth="6" />
            </g>
          </svg>
        )}
        <div
          className="pointer-events-none absolute bottom-3 left-6 flex items-center gap-2 font-mono text-[9px] tracking-wider text-muted sm:left-8"
          aria-hidden="true"
        >
          <span className="h-px w-6 bg-brand/50" />
          PRECISION IN EVERY REP
        </div>
      </div>

      <div className="relative z-10 px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[10px] tracking-[0.12em] text-muted">CHOOSE YOUR RESISTANCE</p>
            <p className="text-5xl leading-none font-medium tracking-[-0.06em]" aria-live="polite">
              <span className="sr-only">Selected weight: </span>
              {String(weight).padStart(2, "0")}
              <span className="ml-2 text-base font-normal tracking-normal text-muted">kg</span>
            </p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Choose dumbbell weight">
            {[5, 10, 15].map((value) => (
              <button
                key={value}
                onClick={() => setWeight(value)}
                aria-label={`${value} kilograms`}
                aria-pressed={weight === value}
                className={`flex size-11 items-center justify-center border text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${value === weight ? "border-brand bg-brand text-background" : "border-line bg-background/30 text-ink hover:border-brand/60 hover:text-brand"}`}
              >
                {String(value).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <p id={hintId} className="max-w-32 text-[11px] leading-relaxed text-muted sm:max-w-none">
            {unavailable ? "Your next rep, visualized." : "Drag to explore. Make it yours."}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={!ready}
              aria-label="Rotate dumbbell left"
              onClick={() => rotate(-0.5)}
              className={controlClass}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              disabled={!ready}
              aria-label="Reset dumbbell view"
              onClick={reset}
              className={controlClass}
            >
              <RotateCcw size={14} />
            </button>
            <button
              disabled={!ready}
              aria-label="Rotate dumbbell right"
              onClick={() => rotate(0.5)}
              className={controlClass}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
