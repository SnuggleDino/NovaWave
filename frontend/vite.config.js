import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        cssCodeSplit: false,
        minify: 'esbuild',
        cssMinify: false,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                v2: path.resolve(__dirname, 'v2.html')
            }
        },
    },
    server: {
        port: 34115,
        strictPort: true,
    }
})
