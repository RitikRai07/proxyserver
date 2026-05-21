import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { HttpsProxyAgent } from 'https-proxy-agent'
import dotenv from 'dotenv'

dotenv.config()

// Proxy credentials from environment variables (required - no defaults)
const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;

// Validate proxy configuration
if (!PROXY_USER || !PROXY_PASS || !PROXY_HOST || !PROXY_PORT) {
  console.warn('⚠️  WARNING: Proxy environment variables not fully configured.');
  console.warn('   Set PROXY_USER, PROXY_PASS, PROXY_HOST, PROXY_PORT in .env file');
}

const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const agent = new HttpsProxyAgent(proxyUrl);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Pass all requests starting with /api to the specified external HTTP proxy
      '/api': {
        // The target should be your actual API backend URL
        target: 'https://jsonplaceholder.typicode.com', // <-- REPLACE THIS with your actual API URL
        changeOrigin: true,
        secure: false,
        agent: agent, // Use the proxy agent to route traffic through 72.60.220.128
        rewrite: (path) => path.replace(/^\/api/, ''), // Optional: rewrite path
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      // New route specifically to check public IP via proxy
      '/check-ip': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('IP Proxy Error:', err);
          });
        }
      }
    }
  }
})
