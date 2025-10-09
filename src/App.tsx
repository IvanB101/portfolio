import { initWebGPU } from './webgpu/webgpu';
import { slime } from './webgpu/slime';
import { useRef } from 'react';

const main = "#180C82";
const bluer = "#0C3B82";
const purpler = "#530C82";

function App() {
    const initialized = useRef(false);

    const setCanvasRef = (canvas: HTMLCanvasElement) => {
        if (!canvas || initialized.current) { return; }

        initialized.current = true;
        canvas.width = 800;
        canvas.height = 600;
        initWebGPU().then(context => {
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

    return (<div className="w-screen h-screen p-0 m-0 relative overflow-hidden">
        <canvas ref={setCanvasRef} className='w-[800px] h-[600px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden'></canvas>
    </div>)
}

export default App
