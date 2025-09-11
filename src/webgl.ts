interface WebGLContext {
    device: GPUDevice,
    adapter: GPUAdapter,
}

async function initWebGL(): Promise<WebGLContext> {
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

    return { device, adapter }
}

export { type WebGLContext, initWebGL }
