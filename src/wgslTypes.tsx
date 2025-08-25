export type vec3f = [number, number, number];
// type vec4f = [number, number, number, number];

export interface Viewer {
    pos: vec3f,
    forward: vec3f,
    up: vec3f,
};

export interface Camera {
    fov: number,
    near: number,
    far: number,
    aspect: number,
};

export interface Uniform {
    viewer: Viewer,
    camera: Camera,
};

export function parse(ubo: Uniform): Float32Array {
    let arr = new Float32Array(4 * 3 + 4);

    arr.set(ubo.viewer.pos, 0);
    arr.set(ubo.viewer.forward, 4);
    arr.set(ubo.viewer.up, 8);

    arr.set([ubo.camera.fov, ubo.camera.near, ubo.camera.far, ubo.camera.aspect], 12);

    return arr;
}

