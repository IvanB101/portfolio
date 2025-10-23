import shaders from "@/shaders/compute/sphere.wgsl";
import type { WebGPUContext } from "./webgpu";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

const defs = makeShaderDataDefinitions(shaders);
const uniform = makeStructuredView(defs.uniforms.ubo);

export interface SphereCompute {
  compute: (n: number) => {
    nVertices: number;
    nIndices: number;
    vbuffer: GPUBuffer;
    ibuffer: GPUBuffer;
  };
}

export function sphere(wgpu: WebGPUContext): SphereCompute {
  const device = wgpu.device;
  const module = device.createShaderModule({
    label: "world module",
    code: shaders,
  });

  const verticesPipeline = device.createComputePipeline({
    label: "sphere vertex gen pipeline",
    layout: "auto",
    compute: {
      module,
      entryPoint: "vertices",
    },
  });
  const indicesPipeline = device.createComputePipeline({
    label: "sphere vertex gen pipeline",
    layout: "auto",
    compute: {
      module,
      entryPoint: "indices",
    },
  });

  function vertices(
    n: number,
    ubo: GPUBuffer,
  ): { nVertices: number; vbuffer: GPUBuffer } {
    const nVertices = 6 * (n + 1) * (n + 1);
    const pipeline = verticesPipeline;
    const vbuffer = device.createBuffer({
      size: nVertices * 6 * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.VERTEX |
        GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: ubo } },
        { binding: 1, resource: { buffer: vbuffer } },
      ],
    });

    const encoder = device.createCommandEncoder({
      label: "vertex gen encoder",
    });
    const pass = encoder.beginComputePass({
      label: "vertex gen compute pass",
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(nVertices / 64));
    pass.end();

    // const mapped = device.createBuffer({
    //     size: nVertices * 8 * 4,
    //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    // })
    // encoder.copyBufferToBuffer(vbuffer, 0, mapped, 0);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // mapped.mapAsync(GPUMapMode.READ).then(_ => {
    //     const arr = new Float32Array(mapped.getMappedRange());
    //     for (let i = 0; i < nVertices; i++) {
    //         console.log(`${i}: (${arr[i * 6]}, ${arr[i * 6 + 1]}, ${arr[i * 6 + 2]})`)
    //     }
    // });

    return {
      nVertices,
      vbuffer,
    };
  }

  function indices(
    n: number,
    ubo: GPUBuffer,
  ): { nIndices: number; ibuffer: GPUBuffer } {
    const nIndices = 6 * 6 * n * n;
    const pipeline = indicesPipeline;
    const ibuffer = device.createBuffer({
      size: nIndices * 4,
      usage:
        GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: ubo } },
        { binding: 1, resource: { buffer: ibuffer } },
      ],
    });

    const encoder = device.createCommandEncoder({
      label: "index gen encoder",
    });
    const pass = encoder.beginComputePass({
      label: "index gen compute pass",
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(nIndices / 64));
    pass.end();

    // const mapped = device.createBuffer({
    //     size: nIndices * 4,
    //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    // })
    // encoder.copyBufferToBuffer(ibuffer, 0, mapped, 0);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // mapped.mapAsync(GPUMapMode.READ).then(_ => {
    //     console.log(new Uint32Array(mapped.getMappedRange()))
    // });

    return {
      nIndices,
      ibuffer,
    };
  }

  function compute(n: number) {
    const ubo = device.createBuffer({
      size: uniform.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    uniform.set({ n });
    device.queue.writeBuffer(ubo, 0, uniform.arrayBuffer);

    const { nVertices, vbuffer } = vertices(n, ubo);
    const { nIndices, ibuffer } = indices(n, ubo);

    return {
      nVertices,
      nIndices,
      vbuffer,
      ibuffer,
    };
  }

  return {
    compute,
  };
}
