import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Put the heavy 3D engine in its own file
                    three: ['three'],
                    // Put the networking library in its own file
                    mqtt: ['mqtt']
                }
            }
        }
    }
});