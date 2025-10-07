import { initWebGPU } from './webgpu';
import { slime, type Slime } from './slime';
import { useRef } from 'react';

function App() {
    const initialized = useRef(false);

    const setCanvasRef = (canvas: HTMLCanvasElement) => {
        if (!canvas || initialized.current) { return; }

        initialized.current = true;
        canvas.width = 800;
        canvas.height = 600;
        initWebGPU().then(context => {
            // surface.current = cellular(context, canvas);
            // surface.current = world(context, canvas, 100);
            const surface = slime(context, canvas, {});

            (function loop() {
                surface.update();
                surface.render();
                requestAnimationFrame(() => loop());
            })()
        }).catch(e => {
            alert(e);
        })
    }


    return (
        <div className="w-screen h-screen p-0 m-0">
            <canvas ref={setCanvasRef} className='w-[800px] h-[600px]'></canvas>
        </div>
    )
}

export default App
