import { use, useEffect, useRef } from 'react'
import { initWebGL, type WebGLContext } from './webgl';

function App() {
    const initialized = useRef(false);
    const webGLContext = useRef<WebGLContext>(null);

    useEffect(() => {
        if (initialized.current) {
            return;
        }
        initWebGL()
            .then(context => {
                webGLContext.current = context;
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
