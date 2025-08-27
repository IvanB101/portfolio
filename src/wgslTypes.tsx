import { off } from "process";

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
    time: number
    display: Display,
    viewer: Viewer,
    camera: Camera,
};

export function parse(ubo: Uniform): Float32Array {
    let floatArr = new Float32Array(4 * 4
        + 4
        + 4 * 3
        + 3
        + 1 // padding
    );
    let uintArr = new Uint32Array(floatArr.buffer);
    var offset = 0;

    uintArr.set([ubo.time, 0, 0, 0], offset);
    offset += 4;
    uintArr.set([ubo.display.max_width, ubo.display.max_height, ubo.display.width, ubo.display.height], offset);
    offset += 4;

    floatArr.set(ubo.viewer.pos, offset);
    offset += 4;
    floatArr.set(ubo.viewer.forward, offset);
    offset += 4;
    floatArr.set(ubo.viewer.up, offset);
    offset += 4;

    floatArr.set([ubo.camera.fov, ubo.camera.near, ubo.camera.far], offset);

    return floatArr;
}

