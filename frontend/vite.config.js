import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        cssCodeSplit: false,
        minify: 'esbuild',
        cssMinify: false, // Disable CSS minification to preserve all styles
    },
    server: {
        port: 34115,
        strictPort: true,
    }
})
