import path from 'path';

export default {
    server: {
        port: 5173,
        host: true,
    },
    resolve: {
        alias: {
            '@decky/ui': path.resolve(__dirname, 'playground/mocks/deckyUi.tsx'),
            '@decky/api': path.resolve(__dirname, 'playground/mocks/deckyApi.ts'),
            '@decky/manifest': path.resolve(__dirname, 'playground/mocks/deckyManifest.ts'),
        },
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        exclude: ['@decky/ui', '@decky/api', '@decky/manifest'],
    },
    esbuild: {
        jsx: 'automatic',
    },
};
