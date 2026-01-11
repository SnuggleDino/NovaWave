import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        cssCodeSplit: false,
        minify: 'esbuild',
        cssMinify: false,
    },
    server: {
        port: 34115,
        strictPort: true,
    }
})
