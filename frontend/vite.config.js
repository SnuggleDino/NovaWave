import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        cssCodeSplit: true,
        minify: 'esbuild',
        cssMinify: false,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                lite: path.resolve(__dirname, 'lite.html')
            }
        },
    },
    server: {
        port: 34115,
        strictPort: false,
    }
})