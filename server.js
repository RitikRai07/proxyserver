import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;

// Validate proxy configuration
if (!PROXY_USER || !PROXY_PASS || !PROXY_HOST || !PROXY_PORT) {
  console.error('❌ ERROR: Proxy credentials are incomplete. Please check your .env file.');
  console.error('   Required: PROXY_USER, PROXY_PASS, PROXY_HOST, PROXY_PORT');
  process.exit(1);
}

const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const proxyAgent = new HttpsProxyAgent(proxyUrl);

// Generic proxy middleware - Frontend usage: fetch('http://localhost:3001/proxy?url=https://api.example.com/data')
app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid target URL in "url" query parameter' });
  }

  try {
    const targetUrlObj = new URL(targetUrl);
    
    createProxyMiddleware({
      target: targetUrlObj.origin,
      changeOrigin: true,
      agent: proxyAgent,
      pathRewrite: () => targetUrlObj.pathname + targetUrlObj.search,
      onProxyReq: () => {
        console.log(`[Proxy] Forwarding request to: ${targetUrl}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] ${err.message}`);
        res.status(500).json({ error: 'Proxy forwarding failed', details: err.message });
      }
    })(req, res, next);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL format', details: err.message });
  }
});

// Specific endpoint for IP address checking through proxy
app.get('/check-ip', (req, res, next) => {
  createProxyMiddleware({
    target: 'https://api.ipify.org',
    changeOrigin: true,
    agent: proxyAgent,
    pathRewrite: () => '/?format=json',
    onProxyReq: () => {
      console.log('[IP Check] Fetching public IP address via proxy');
      console.log(`[Proxy] Using: ${PROXY_HOST}:${PROXY_PORT} with user: ${PROXY_USER}`);
    },
    onProxyRes: (proxyRes) => {
      console.log(`[IP Check Response] Status: ${proxyRes.statusCode}`);
      if (proxyRes.statusCode !== 200) {
        console.warn(`[IP Check] Proxy returned status ${proxyRes.statusCode} - may be auth or connectivity issue`);
      }
    },
    onError: (err, req, res) => {
      console.error(`[IP Check Error] ${err.message}`);
      console.error(`[IP Check Error Details] ${err.code} - ${err.errno}`);
      res.status(500).json({ 
        error: 'Failed to check IP address through proxy',
        details: err.message,
        code: err.code,
        hint: 'Verify proxy credentials in .env file (PROXY_USER, PROXY_PASS, PROXY_HOST, PROXY_PORT)'
      });
    }
  })(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`🔄 Outbound traffic routed via: ${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`📡 Endpoints available:`);
  console.log(`   - GET /check-ip (check public IP via proxy)`);
  console.log(`   - GET /proxy?url=<target_url> (generic proxy endpoint)`);
  console.log(`   - GET /health (health check)`);
});
