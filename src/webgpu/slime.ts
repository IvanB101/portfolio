import shaders from "/shaders/slime.wgsl?raw"
import { colorHexToVec3f } from "./math";
import type { WebGPUContext } from './webgpu';
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils';

export interface Slime {
    render: () => void,
    update: () => void,
}

function bufferPaddingBytes(rowSize: number): number {
    const elementSize = 1;
    const size = rowSize * elementSize;
    const paddingBytes = 256 - (size % 256);

    return Math.ceil(paddingBytes / elementSize);
}

export type UserConfig = {
    innerDims: [number, number],
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
const width = 400;
const aspect = screen.width / screen.height;
const height = Math.ceil(width / aspect);
const size: [number, number] = [width, height];
const defaultConfig: Config = {
    time: 0,
    nAgents: 100000,
    size,
    sensoryAngle: Math.PI / 4,
    sensoryOffset: 5,
    decay: 0.7,
    turnRate: Math.PI / 8,
    padding: bufferPaddingBytes(size[0]),
};

function completeConfig(userConfig: UserConfig): Config {
    const config: Config = defaultConfig;
    for (const key in config) {
        if (userConfig[key]) {
            config[key] = userConfig[key];
        }
    }
    config.padding = bufferPaddingBytes(config.size[0]);

    return config as Config;
}

type RenderConfig = {
    uvMin: [number, number];
    uvMax: [number, number];
    size: [number, number];
    startDims: [number, number];
    color: [number, number, number];
}

export type InitConfig = {
    seed: number;
    nAgents: number;
    size: [number, number],
};

function initRender(device: GPUDevice, canvas: HTMLCanvasElement, medium: GPUBuffer, config: RenderConfig): () => void {
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
    const pipeline = device.createRenderPipeline({
        label: 'slime pipeline',
        layout: 'auto',
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

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: medium },
        ],
    });

    function render() {
        let uvMin = [
            Math.max(config.startDims[0] - canvas.width, 0) / config.startDims[0] / 2,
            Math.max(config.startDims[1] - canvas.height, 0) / config.startDims[1] / 2,
        ];
        let uvMax = [
            1 - uvMin[0],
            1 - uvMin[1],
        ]

        uniform.set({
            time: performance.now(),
            uvMin,
            uvMax,
        });
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
    };
    const renderConfig: RenderConfig = {
        size: config.size,
        uvMin: [0, 0],
        uvMax: [1, 1],
        startDims: userConfig.innerDims,
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
    const size = config.size[0] * config.size[1] * 16;
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

    function update() {
        configView.set({ time: performance.now() });
        device.queue.writeBuffer(configBuf, 0, configView.arrayBuffer);

        var encoder = device.createCommandEncoder();

        var pass = encoder.beginComputePass({ label: 'slime update medium compute pass', });
        pass.setBindGroup(0, mediumBindGroup);
        pass.setPipeline(updateMediumPipeline);
        pass.dispatchWorkgroups(Math.ceil(config.size[0] * config.size[1] / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);

        encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(mediumBufs[1], mediumBufs[0]);
        pass = encoder.beginComputePass({ label: 'slime update agents compute pass', });
        pass.setBindGroup(0, agentBindGroup);
        pass.setPipeline(updateAgentsPipeline);
        pass.dispatchWorkgroups(Math.ceil(config.nAgents / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);
    }
    const render = initRender(device, canvas, mediumBufs[0], renderConfig);

    return {
        render,
        update,
    }
}

