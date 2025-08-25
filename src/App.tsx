import { useEffect, useRef } from 'react'
import simpleShaders from "../shaders/simple.wgsl?raw"
import { parse, type Uniform } from './wgslTypes';

async function setupWebGPU() {
    if (!navigator.gpu) {
        throw Error("WebGPU not supported on this browser.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error('this browser supports webgpu but it appears disabled');
    }

    const device = await adapter.requestDevice() as GPUDevice;
    device.lost.then((info) => {
        console.error(`WebGPU device was lost: ${info.message}`);
        // TODO: handle losing the device (restart)
        // if (info.reason !== 'destroyed') { }
        throw Error(`WebGPU device was lost: ${info.message}`)
    });

    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
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
        label: 'our hardcoded red triangle shaders',
        code: simpleShaders,
    });

    const pipeline = device.createRenderPipeline({
        label: 'our hardcoded red triangle pipeline',
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
        label: 'our basic canvas renderPass',
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            // clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const ubo: Uniform = {
        viewer: {
            pos: [0, 0, 3],
            forward: [0, 0, -1],
            up: [0, 1, 0],
        },
        camera: {
            fov: Math.PI / 2,
            near: 0.1,
            far: 20,
            aspect: canvas.height / canvas.width,
        }
    };

    let uboArr = parse(ubo);
    const uniformBuffer = device.createBuffer({
        size: uboArr.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
        ],
    });

    function render() {
        ubo.camera.aspect = canvas.width / canvas.height;
        uboArr = parse(ubo);
        device.queue.writeBuffer(uniformBuffer, 0, uboArr);

        (renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({ label: 'main encoder' });

        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
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

    render();
}

function App() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) {
            return;
        }
        setupWebGPU().catch(e => {
            // TODO: provide alternative
            alert(e)
        })
        initialized.current = true;
    }, [])

    return (
        <div className="w-screen h-screen p-0 m-0">
            <canvas id='main-canvas' className='w-full h-full'></canvas>
        </div>
    )
}

export default App
