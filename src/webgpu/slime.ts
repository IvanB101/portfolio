import shaders from "/shaders/slime.wgsl?raw"
import { colorHexToVec3f } from "./math";
import type { WebGPUContext } from './webgpu';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';

export interface Slime {
    render: () => void,
    update: () => void,
}

function bufferPaddingBytes(rowByteSize: number): number {
    return 256 - (rowByteSize % 256);
}

export type UserConfig = {
    seed?: number;
    nAgents?: number;
    size?: [number, number],
    sensoryAngle?: number;
    sensoryOffset?: number;
    decay?: number;
    turnRate?: number;
    color?: [number, number, number];
} & { [idx: string]: number | number[] };
type Config = {
    time: number,
    nAgents: number;
    size: [number, number],
    sensoryAngle: number;
    sensoryOffset: number;
    decay: number;
    turnRate: number;
    padding: number;
} & { [idx: string]: number | number[] };
const size: [number, number] = [400, 300];
const defaultConfig: Config = {
    time: 0,
    nAgents: 100000,
    size,
    sensoryAngle: Math.PI / 4,
    sensoryOffset: 6,
    decay: 0.7,
    turnRate: Math.PI / 8,
    padding: bufferPaddingBytes(size[0] * 4) / 4,
};

function completeConfig(userConfig: UserConfig): Config {
    const config: Config = defaultConfig;
    for (const key in config) {
        if (userConfig[key]) {
            config[key] = userConfig[key];
        }
    }
    config.padding = bufferPaddingBytes(config.size[0] * 4) / 4;

    return config as Config;
}

type RenderConfig = {
    dims: [number, number];
    color: [number, number, number];
}

export type InitConfig = {
    seed: number;
    nAgents: number;
    size: [number, number],
    padding: number;
};

function initRender(device: GPUDevice, canvas: HTMLCanvasElement, texture: GPUTexture, config: RenderConfig): () => void {
    const defs = makeShaderDataDefinitions(shaders);
    const uniform = makeStructuredView(defs.uniforms.ubo);

    const context = canvas?.getContext('webgpu') as GPUCanvasContext;
    if (!context) {
        throw Error("could not create context")
    }
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    const module = device.createShaderModule({
        label: 'slime module',
        code: shaders,
    });

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform'
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'unfilterable-float',
                    viewDimension: '2d',
                    multisampled: false,
                },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: 'non-filtering',
                },
            },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    })
    const pipeline = device.createRenderPipeline({
        label: 'slime pipeline',
        layout: pipelineLayout,
        vertex: {
            module,
        },
        fragment: {
            module,
            targets: [{ format: presentationFormat }],
        },
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'slime render pass',
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            // clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const uniformBuffer = device.createBuffer({
        size: uniform.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    uniform.set(config);

    const sampler = device.createSampler({});
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: sampler },
        ],
    });

    function render() {
        uniform.set({
            time: performance.now(),
        })
        device.queue.writeBuffer(uniformBuffer, 0, uniform.arrayBuffer);

        (renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({ label: 'slime render encoder' });

        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    // const observer = new ResizeObserver(entries => {
    //     for (const entry of entries) {
    //         const canvas = entry.target as HTMLCanvasElement;
    //         const width = entry.contentBoxSize[0].inlineSize;
    //         const height = entry.contentBoxSize[0].blockSize;
    //         canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
    //         canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    //     }
    //     render();
    // });
    // observer.observe(canvas);

    return render;
}

export function slime({ device }: WebGPUContext, canvas: HTMLCanvasElement, userConfig: UserConfig): Slime {
    const defs = makeShaderDataDefinitions(shaders);
    const time = performance.now();
    const config = completeConfig(userConfig);
    const initConfig: InitConfig = {
        seed: userConfig.seed || time,
        nAgents: config.nAgents,
        size: config.size,
        padding: config.padding,
    };
    const renderConfig: RenderConfig = {
        dims: config.size,
        color: userConfig.color || colorHexToVec3f("#0C3B82"),
    }

    const module = device.createShaderModule({
        label: 'slime simulation module',
        code: shaders,
    });

    const initAgentsPipeline = device.createComputePipeline({
        label: 'slime update agents pipeline',
        layout: 'auto',
        compute: { module, entryPoint: 'initAgents' },
    });

    const updateAgentsPipeline = device.createComputePipeline({
        label: 'slime update agents pipeline',
        layout: 'auto',
        compute: { module, entryPoint: 'updateAgents' },
    });
    const updateMediumPipeline = device.createComputePipeline({
        label: 'slime update agents pipeline',
        layout: 'auto',
        compute: { module, entryPoint: 'updateMedium' },
    });

    const agentBuf = device.createBuffer({
        size: config.nAgents * 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const size = (config.size[0] + config.padding) * config.size[1] * 16;
    const mediumBufs = [
        device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, }),
        device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, }),
    ];

    { // Agents initialization
        const view = makeStructuredView(defs.uniforms.iconfig);
        const iconfig = device.createBuffer({
            size: view.arrayBuffer.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        view.set(initConfig);
        device.queue.writeBuffer(iconfig, 0, view.arrayBuffer);

        var initBindGroup = device.createBindGroup({
            layout: initAgentsPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: iconfig } },
                { binding: 1, resource: { buffer: agentBuf } },
                { binding: 2, resource: { buffer: mediumBufs[1] } },
            ],
        });

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass({ label: 'slime init agents compute pass', });
        pass.setPipeline(initAgentsPipeline);
        pass.setBindGroup(0, initBindGroup);
        pass.dispatchWorkgroups(Math.ceil(config.nAgents / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    const configView = makeStructuredView(defs.uniforms.config);
    const configBuf = device.createBuffer({
        size: configView.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    configView.set(config);

    const agentBindGroup = device.createBindGroup({
        layout: updateAgentsPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: configBuf } },
            { binding: 1, resource: { buffer: mediumBufs[0] } },
            { binding: 2, resource: { buffer: mediumBufs[1] } },
            { binding: 3, resource: { buffer: agentBuf } }
        ]
    });
    const mediumBindGroup = device.createBindGroup({
        layout: updateMediumPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: configBuf } },
            { binding: 1, resource: { buffer: mediumBufs[0] } },
            { binding: 2, resource: { buffer: mediumBufs[1] } },
        ]
    });

    const texture = device.createTexture({
        size: config.size,
        format: 'r32float',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })

    // const logBuf = device.createBuffer({
    //     size: config.nAgents * 16,
    //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    // });

    function update() {
        configView.set({ time: performance.now() });
        device.queue.writeBuffer(configBuf, 0, configView.arrayBuffer);

        var encoder = device.createCommandEncoder();

        var pass = encoder.beginComputePass({ label: 'slime init agents compute pass', });
        pass.setBindGroup(0, mediumBindGroup);
        pass.setPipeline(updateMediumPipeline);
        pass.dispatchWorkgroups(Math.ceil(config.size[0] * config.size[1] / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);

        encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(mediumBufs[1], mediumBufs[0]);
        pass = encoder.beginComputePass({ label: 'slime init agents compute pass', });
        pass.setBindGroup(0, agentBindGroup);
        pass.setPipeline(updateAgentsPipeline);
        pass.dispatchWorkgroups(Math.ceil(config.nAgents / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);

        encoder = device.createCommandEncoder();
        encoder.copyBufferToTexture(
            { buffer: mediumBufs[0], bytesPerRow: (config.size[0] + config.padding) * 4 },
            { texture },
            [...config.size, 1]
        )
        device.queue.submit([encoder.finish()]);

        // await logBuf.mapAsync(GPUMapMode.READ);
        // console.log(new Float32Array(logBuf.getMappedRange()));
        // logBuf.unmap();
    }
    const render = initRender(device, canvas, texture, renderConfig);

    return {
        render,
        update,
    }
}

