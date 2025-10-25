"use client";

import { slime } from "@/lib/webgpu/slime";
import { initWebGPU, WebGPUContext } from "@/lib/webgpu/webgpu";
import { useRef } from "react";

let context: WebGPUContext;
try {
  context = await initWebGPU();
} catch (e) {}

export default function Background() {
  const initialized = useRef(false);

  const setCanvasRef = (canvas: HTMLCanvasElement) => {
    if (!canvas || initialized.current || !context) {
      return;
    }

    initialized.current = true;

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
  };

  // TODO: use css to handle distortion, render to canvas of more similar size to sim size

  return context ? (
    <canvas
      ref={setCanvasRef}
      className="w-screen h-screen fixed overflow-hidden z-[-1] left-0 top-0 blur-xs"
    ></canvas>
  ) : (
    // TODO: add fallback background
    <img
      src="/logos/next.svg"
      className="w-screen h-screen fixed overflow-hidden z-[-1] left-0 top-0 blur-xs"
    />
  );
}
