import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // resolve: {
    //     alias: {
    //         mqtt: resolve(__dirname, 'node_modules/mqtt/dist/mqtt.min.js'),
    //     },
    // },
    build: {
        chunkSizeWarningLimit: 600,
        // rollupOptions: {
        //     output: {
        //         manualChunks(id) {
        //             if (id.includes('node_modules/three')) {
        //                 return 'three';
        //             }
        //             if (id.includes('node_modules/mqtt')) {
        //                 return 'mqtt';
        //             }
        //         }
        //     }
        // }
    }
});