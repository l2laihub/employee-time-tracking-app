import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/resend/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add the API key from the loaded env
              const apiKey = env.VITE_RESEND_API_KEY;
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              }
            });
          }
        }
      }
    }
  };
});
