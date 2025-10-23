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
            // TODO: add more info in case of not supporting webgpu
            // TODO: add alternative
            alert(e);
        })
    }

    // TODO: use css to handle distortion, render to canvas of more similar size to sim size

    return (<div id="home" className="w-full flex flex-col items-center" >
        <canvas ref={setCanvasRef} className='w-screen h-screen fixed overflow-hidden z-[-1] left-0 top-0 blur-xs' > </canvas>
        <div className='flex flex-col gap-4 md:gap-10 items-center h-screen justify-center'>
            <div className='text-5xl md:text-7xl lg:text-8xl font-archivo'>Ivan Brocas</div>
            <div className='text-xl md:text-2xl lg:text-3xl'>Software Engineer, Full-stack developer</div>
        </div>
    </div>);
}
