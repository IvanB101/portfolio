import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import shaders from "@/shaders/noise.wgsl";
import type { WebGPUContext } from "./webgpu";

export interface Cellular {
  render: () => void;
}

const defs = makeShaderDataDefinitions(shaders);
const uniform = makeStructuredView(defs.uniforms.ubo);

export function cellular(
  wgpu: WebGPUContext,
  canvas: HTMLCanvasElement,
): Cellular {
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
    label: "cellular module",
    code: shaders,
  });

  const pipeline = device.createRenderPipeline({
    label: "cellular pipeline",
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
    label: "cellular render pass",
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
    display: {
      max_width: window.screen.width,
      max_height: window.screen.height,
      width: canvas.width,
      height: canvas.height,
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
    ubo.display.width = canvas.width;
    ubo.display.height = canvas.height;
    uniform.set({ time: performance.now() });
    uniform.set(ubo);
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
