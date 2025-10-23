export interface WebGPUContext {
  device: GPUDevice;
  adapter: GPUAdapter;
}

export async function initWebGPU(): Promise<WebGPUContext> {
  if (!navigator.gpu) {
    throw Error("WebGPU not supported on this browser.");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("this browser supports webgpu but it appears disabled");
  }

  const device = (await adapter.requestDevice()) as GPUDevice;
  device.lost.then((info) => {
    console.error(`WebGPU device was lost: ${info.message}`);
    // TODO: handle losing the device (restart)
    // if (info.reason !== 'destroyed') { }
    throw Error(`WebGPU device was lost: ${info.message}`);
  });

  return { device, adapter };
}
