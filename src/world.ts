import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import shaders from "../shaders/general.wgsl?raw"
import type { WebGLContext } from './webgl';
import { sphere } from "./sphere";
import { PerspectiveCamera } from "./camera";
import { Mat, Transform3D } from "./math";
import { deform } from "./deform";

const defs = makeShaderDataDefinitions(shaders);
const uniform = makeStructuredView(defs.uniforms.ubo);

export interface World {
    render: () => void,
}

export function world(wgpu: WebGLContext, canvas: HTMLCanvasElement, n: number): World {
    const device = wgpu.device;
    const context = canvas?.getContext('webgpu') as GPUCanvasContext;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    if (!context) {
        throw Error("could not create context")
    }
    context.configure({
        device,
        format: presentationFormat,
    });

    const module = device.createShaderModule({
        label: 'world module',
        code: shaders,
    });

    const pipeline = device.createRenderPipeline({
        label: 'world pipeline',
        layout: 'auto',
        vertex: {
            module,
            buffers: [{
                arrayStride: 8 * 3,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x3' }
                ]
            }]
        },
        fragment: {
            module,
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            // topology: "triangle-list",
            cullMode: "back",
            frontFace: "ccw",
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'world render pass',
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            // clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
        }],
        depthStencilAttachment: {
            view: context.getCurrentTexture().createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    const uniformBuffer = device.createBuffer({
        size: uniform.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
        ],
    });

    const { vbuffer, ibuffer, nIndices, nVertices } = sphere(wgpu).compute(n);
    const deformedVertices = deform(wgpu).compute(nVertices, vbuffer, {
        nLayers: 4,
        magnitude: 0.8,
        compression: 2
    });

    const cam = new PerspectiveCamera({
        pos: [0, 0, -2],
        forward: [0, 0, 1],
        up: [0, 1, 0],
    });

    let transform = new Transform3D({ position: [0, 0, 1] });

    let depthTexture: GPUTexture;

    function render() {
        const target = context.getCurrentTexture();
        const period = 50;
        let angle = performance.now() / 1000 / period * 2 * Math.PI;
        transform.rotation[1] = angle;

        cam.aspect = canvas.width / canvas.height;
        cam.updateProj();
        uniform.set({
            OtW: transform.getMat(),
            WtC: cam.WtC,
            P: cam.P,
            N: transform.getNormalMat(),
            t: performance.now(),
        });

        device.queue.writeBuffer(uniformBuffer, 0, uniform.arrayBuffer);
        if (!depthTexture ||
            depthTexture.width !== target.width ||
            depthTexture.height !== target.height) {
            if (depthTexture) {
                depthTexture.destroy();
            }
            depthTexture = device.createTexture({
                size: [target.width, target.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
        }

        (renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = target.createView();
        (renderPassDescriptor.depthStencilAttachment as GPURenderPassDepthStencilAttachment).view = depthTexture.createView();

        const encoder = device.createCommandEncoder({ label: 'main encoder' });

        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, deformedVertices);
        pass.setIndexBuffer(ibuffer, 'uint32');
        pass.drawIndexed(nIndices);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target as HTMLCanvasElement;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
        }
        render();
    });
    observer.observe(canvas);

    return {
        render: render,
    }
}
