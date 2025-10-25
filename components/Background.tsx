"use client";
import "client-only";

import { slime } from "@/lib/webgpu/slime";
import { initWebGPU, WebGPUContext } from "@/lib/webgpu/webgpu";
import { useEffect } from "react";

let context: WebGPUContext;
try {
  context = await initWebGPU();
} catch (e) {}

function hydrate() {
  if (!context) {
    return;
  }

  let fallback = document.getElementById("background") as HTMLElement;
  let parent = fallback.parentNode as HTMLElement;
  let classes = fallback.classList;
  let canvas = document.createElement("canvas");
  for (const clazz of classes) {
    canvas.classList.add(clazz);
  }
  parent.appendChild(canvas);
  parent.removeChild(fallback);

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      let canvas = entry.target as HTMLCanvasElement;
      canvas.width = entries[0].contentBoxSize[0].inlineSize;
      canvas.height = entries[0].contentBoxSize[0].blockSize;
    }
  });
  observer.observe(canvas);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const pixels = 400 * 300;
  const aspect = width / height;

  const surface = slime(context, canvas, {
    innerDims: [width, height],
    size: [
      Math.round(Math.sqrt(pixels * aspect)),
      Math.round(Math.sqrt(pixels / aspect)),
    ],
  });

  (function loop() {
    surface.update();
    surface.render();
    requestAnimationFrame(() => loop());
  })();
}

export default function Background() {
  useEffect(hydrate, []);

  // TODO: use css to handle distortion, render to canvas of more similar size to sim size

  return (
    // TODO: add fallback background
    <img
      id="background"
      src="/logos/next.svg"
      className="w-screen h-screen fixed overflow-hidden z-[-1] left-0 top-0 blur-xs"
    />
  );
}
