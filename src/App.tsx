import { useEffect, useRef } from 'react'
import { initWebGL, type WebGLContext } from './webgl';
import { world, type World } from './world';

function App() {
    const initialized = useRef(false);
    const wgpu = useRef<WebGLContext>(null);
    const surface = useRef<World>(null);

    useEffect(() => {
        if (initialized.current) {
            return;
        }
        initWebGL()
            .then(context => {
                wgpu.current = context;
                const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
                surface.current = world(context, canvas, 2);
                surface.current.render();

                (function loop() {
                    surface.current.render();
                    requestAnimationFrame(() => loop());
                })()

            })
            .catch(e => {
                alert(e) // TODO: provide alternative
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
