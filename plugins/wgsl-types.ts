import { Plugin } from 'vite'
import fg from 'fast-glob'
import fs from 'fs'
import path from 'path'

// Dummy generator (replace with your actual logic)
function generateTypes(wgslFilePath: string): string {
    const content = fs.readFileSync(wgslFilePath, 'utf-8')
    // TODO: Parse WGSL struct and generate TS types
    return `// Types for ${path.basename(wgslFilePath)}\n\nexport interface DummyStruct { x: number }`
}

export default function wgslTypes(): Plugin {
    return {
        name: 'vite-plugin-wgsl-types',

        // Called when the dev server starts
        async buildStart() {
            return
            const files = await fg(['./shaders/**/*.wgsl'])

            for (const file of files) {
                const types = generateTypes(file)
                const outPath = file.replace(/\.wgsl$/, '.d.ts')
                fs.writeFileSync(outPath, types, 'utf-8')
            }
        },

        // Called when any file is changed in dev mode
        handleHotUpdate({ file }) {
            return
            if (file.endsWith('.wgsl')) {
                const types = generateTypes(file)
                const outPath = file.replace(/\.wgsl$/, '.d.ts')
                fs.writeFileSync(outPath, types, 'utf-8')
            }
        },
    }
}
