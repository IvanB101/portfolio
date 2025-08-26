export type vec3f = [number, number, number];
// type vec4f = [number, number, number, number];

export interface Display {
    max_width: number,
    max_height: number,
    width: number,
    height: number,
};

export interface Viewer {
    pos: vec3f,
    forward: vec3f,
    up: vec3f,
};

export interface Camera {
    fov: number,
    near: number,
    far: number,
};

export interface Uniform {
    display: Display,
    viewer: Viewer,
    camera: Camera,
};

export function parse(ubo: Uniform): Float32Array {
    let floatArr = new Float32Array(4
        + 4 * 3
        + 3
        + 1 // padding
    );
    let uintArr = new Uint32Array(floatArr.buffer);

    uintArr.set([ubo.display.max_width, ubo.display.max_height, ubo.display.width, ubo.display.height], 0);

    floatArr.set(ubo.viewer.pos, 4);
    floatArr.set(ubo.viewer.forward, 8);
    floatArr.set(ubo.viewer.up, 12);

    floatArr.set([ubo.camera.fov, ubo.camera.near, ubo.camera.far], 16);

    return floatArr;
}

