import { initWebGPU } from './webgpu/webgpu';
import { slime } from './webgpu/slime';
import { useRef } from 'react';


export default function Header() {
    const initialized = useRef(false);

    const setCanvasRef = (canvas: HTMLCanvasElement) => {
        if (!canvas || initialized.current) { return; }

        initialized.current = true;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                let canvas = entry.target as HTMLCanvasElement;
                canvas.width = entries[0].contentBoxSize[0].inlineSize;
                canvas.height = entries[0].contentBoxSize[0].blockSize;
            }
        });
        observer.observe(canvas);

        const width = window.innerWidth;
        const height = window.innerHeight;

        const pixels = 400 * 300;
        const aspect = width / height;

        initWebGPU().then(context => {
            const surface = slime(context, canvas, {
                innerDims: [width, height],
                size: [
                    Math.round(Math.sqrt(pixels * aspect)),
                    Math.round(Math.sqrt(pixels / aspect))
                ],
            });

            (function loop() {
                surface.update();
                surface.render();
                requestAnimationFrame(() => loop());
            })()
        }).catch(e => {
            alert(e);
        })
    }

    // TODO: miniize texture distortion
    return (<div className="w-screen h-screen" >
        <canvas ref={setCanvasRef} className='w-screen h-screen fixed overflow-hidden z-[-1] left-0 top-0' > </canvas>
    </div>);
}
