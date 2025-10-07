import { makeShaderDataDefinitions, makeStructuredView, type StructuredView } from "webgpu-utils";
import type { WebGPUContext } from "./webgl";

export type Config = {
    wgpu: WebGPUContext,
    code: string,
    label: string,
    entryPoint?: string,
    uniformName?: string,
    bindings: Iterable<GPUBindGroupEntry>;
}

export type ComputeShader = {
    bind: (bindings: Iterable<GPUBindGroupEntry>) => void,
    writeUbo: (data: any) => void,
    dispatch: (xDispatchSize: number, yDispatchSize?: number, zDispatchSize?: number) => void,
}

export function createComputeShader({ wgpu, code, label, entryPoint, uniformName, bindings }: Config): ComputeShader {
    const device = wgpu.device;

    const defs = makeShaderDataDefinitions(code);
    var view: StructuredView;
    var ubo: GPUBuffer;

    const module = device.createShaderModule({
        label,
        code,
    });

    const pipeline = wgpu.device.createComputePipeline({
        label,
        layout: 'auto',
        compute: {
            module,
            entryPoint
        },
    });

    const uniformBindings: GPUBindGroupEntry[] = [];
    if (defs.uniforms) {
        view = makeStructuredView(defs.uniforms[uniformName || "ubo"]);
        ubo = device.createBuffer({
            size: view.arrayBuffer.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        uniformBindings.push({
            binding: 0, resource: { buffer: ubo },
        })
    }

    var bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [...uniformBindings, ...bindings],
    });

    function bind(bindings: Iterable<GPUBindGroupEntry>) {
        bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [...uniformBindings, ...bindings],
        });
    }

    function writeUbo(data: any) {
        if (!view) {
            return;
        }

        view.set(data);
        wgpu.device.queue.writeBuffer(ubo, 0, view.arrayBuffer);
    }

    function dispatch(xDispatchSize: number, yDispatchSize?: number, zDispatchSize?: number) {
        const encoder = device.createCommandEncoder({
            label: label,
        });
        const pass = encoder.beginComputePass({
            label: label,
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(xDispatchSize, yDispatchSize, zDispatchSize);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    return {
        bind,
        writeUbo,
        dispatch,
    }
}
