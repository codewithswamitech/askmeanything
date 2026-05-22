import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Azure OpenAI config
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";

const app = express();
const port = 3005; // Port for the local proxy

app.use(cors());

// Add body parsing to inspect requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to map standard OpenAI format to Azure OpenAI format
app.use('/v1', (req, res, next) => {
  console.log(`[Proxy] Incoming request: ${req.method} ${req.path}`);
  // If this is a chat completions request
  if (req.path === '/chat/completions') {
    // Modify body if needed, e.g., Azure doesn't like some standard parameters
    if (req.body && typeof req.body === 'object') {
      // Force the model to be the deployment name if needed, though Azure ignores it
      // Azure uses the deployment name in the URL instead
      // Delete thinking param if Azure doesn't support it
      if (req.body.thinking) {
        delete req.body.thinking;
      }
      
      // Azure often fails with undefined or specific unsupported parameters from newer standard OpenAI
      if (req.body.stream === undefined) delete req.body.stream;
    }
  }
  next();
});

// Create the proxy middleware
app.use('/v1', createProxyMiddleware({
  target: AZURE_ENDPOINT,
  changeOrigin: true,
  proxyTimeout: 120000, // 2 minutes
  timeout: 120000,
  pathRewrite: (path, req) => {
    // Translate standard path to Azure path
    // From: /v1/chat/completions
    // To: /openai/deployments/{deployment-id}/chat/completions?api-version={api-version}
    let newPath = path.replace('/v1', '');
    return `/openai/deployments/${AZURE_DEPLOYMENT}${newPath}?api-version=${AZURE_API_VERSION}`;
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Add the api-key header required by Azure
      proxyReq.setHeader('api-key', AZURE_API_KEY);
      
      // Remove the Bearer token as Azure uses api-key
      proxyReq.removeHeader('authorization');

      // If we parsed the body earlier, we need to restream it
      // @ts-ignore
      if (req.body) {
        // @ts-ignore
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`[Proxy] Response from Azure: ${proxyRes.statusCode}`);
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err);
      // @ts-ignore
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  }
}));

app.listen(port, () => {
  console.log(`Azure OpenAI Proxy Server running at http://localhost:${port}`);
  console.log(`Routing requests to: ${AZURE_ENDPOINT}`);
});
