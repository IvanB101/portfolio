import "client-only";

import shaders from "@/shaders/raymarcher.wgsl";
import type { WebGPUContext } from "./webgpu";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

const defs = makeShaderDataDefinitions(shaders);
const uniform = makeStructuredView(defs.uniforms.ubo);

export interface Raymarcher {
  render: () => void;
}

export function raymarcher(
  wgpu: WebGPUContext,
  canvas: HTMLCanvasElement,
): Raymarcher {
  const device = wgpu.device;
  const context = canvas?.getContext("webgpu") as GPUCanvasContext;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  if (!context) {
    throw Error("could not create context");
  }
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: "raymarcher module",
    code: shaders,
  });

  const pipeline = device.createRenderPipeline({
    label: "raymarcher pipeline",
    layout: "auto",
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "raymarcher render pass",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        // clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const ubo = {
    time: Date.now(),
    display: {
      max_width: window.screen.width,
      max_height: window.screen.height,
      width: canvas.width,
      height: canvas.height,
    },
    viewer: {
      pos: [3, 5, 3],
      forward: [-1, -2, -1],
      up: [0, 1, 0],
    },
    // viewer: {
    //     pos: [-3, 5, -3],
    //     forward: [1, -2, 1],
    //     up: [0, 1, 0],
    // },
    camera: {
      fov: Math.PI / 2,
      near: 0.1,
      far: 20,
    },
  };

  const uniformBuffer = device.createBuffer({
    size: uniform.arrayBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  uniform.set(ubo);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function render() {
    uniform.set({
      time: performance.now(),
      display: {
        width: canvas.width,
        height: canvas.height,
      },
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniform.arrayBuffer);

    (
      renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: "main encoder" });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(
        1,
        Math.min(width, device.limits.maxTextureDimension2D),
      );
      canvas.height = Math.max(
        1,
        Math.min(height, device.limits.maxTextureDimension2D),
      );
    }
    render();
  });
  observer.observe(canvas);

  return {
    render: render,
  };
}
