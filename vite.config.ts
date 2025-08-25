import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import wgslTypes from "./plugins/wgsl-types.ts"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), wgslTypes()],
})
