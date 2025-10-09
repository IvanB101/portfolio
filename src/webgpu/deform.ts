import shaders from "/shaders/compute/deform_perlin.wgsl?raw"
import type { WebGPUContext } from './webgpu';
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

const defs = makeShaderDataDefinitions(shaders);
const uniform = makeStructuredView(defs.uniforms.ubo);

export interface NoiseParams {
    nLayers?: number,
    magnitude?: number,
    compression?: number,
}

export interface DeformCompute {
    compute: (nVertices: number, vbuffer: GPUBuffer, params: NoiseParams) => GPUBuffer,
}

export function deform(wgpu: WebGPUContext): DeformCompute {
    const device = wgpu.device;
    const module = device.createShaderModule({
        label: 'world module',
        code: shaders,
    });

    const pipeline = device.createComputePipeline({
        label: 'deform pipeline',
        layout: 'auto',
        compute: {
            module,
        },
    });

    function compute(nVertices: number, vbuffer: GPUBuffer, { nLayers, magnitude, compression }: NoiseParams) {
        const ubo = device.createBuffer({
            size: uniform.arrayBuffer.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        uniform.set({
            nVertices,
            nLayers: nLayers || 4,
            magnitude: magnitude || 0.2,
            compression: compression || 1,
        });
        device.queue.writeBuffer(ubo, 0, uniform.arrayBuffer);

        const buffer = device.createBuffer({
            size: vbuffer.size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
        })

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: ubo } },
                { binding: 1, resource: { buffer: vbuffer } },
                { binding: 2, resource: { buffer: buffer } },
            ],
        });

        const encoder = device.createCommandEncoder({
            label: 'vertex gen encoder',
        });
        const pass = encoder.beginComputePass({
            label: 'vertex gen compute pass',
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(nVertices / 64));
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        return buffer;
    }

    return {
        compute,
    }
}
