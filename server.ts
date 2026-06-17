import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { runLiveAgentAnalysis } from './src/engine/agentEngine';

// Load environment variables before doing anything else
dotenv.config();

// Validate critical environment variables at startup
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL STARTUP ERROR: GEMINI_API_KEY is not defined in the environment variables.');
  console.error('Please configure GEMINI_API_KEY inside the .env file in the root directory.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Headers (Helmet) with customized Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        upgradeInsecureRequests: []
      }
    }
  })
);

// 2. CORS configuration (restrict to same-origin and proxy local calls)
app.use(cors({
  origin: true, // Allow same-origin and proxy
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 3. Simple API Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 4. Rate Limiting System (DDoS and abuse protection)
// General API Rate Limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  message: { type: 'error', error: 'Çok fazla genel API isteği gönderildi. Lütfen bir süre sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict Rate Limiter for Gemini Multi-Agent API calls
const agentAnalysisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 analyses per minute (prevent credit exhaustion)
  message: { type: 'error', error: 'Dakikalık analiz istek sınırına ulaştınız. Lütfen bir dakika bekledikten sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters to routes
app.use('/api/', generalApiLimiter);
app.use('/api/analyze', agentAnalysisLimiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

// Serve compiled react files in production if dist directory exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Streaming live agent analysis endpoint
app.post('/api/analyze', async (req, res, next) => {
  const { riskLevel, investmentGoal, horizon, customPortfolio } = req.body;

  // Basic request payload validation
  if (!riskLevel || riskLevel < 1 || riskLevel > 10 || !investmentGoal || !horizon) {
    res.status(400).json({ type: 'error', error: 'Eksik veya geçersiz analiz parametreleri.' });
    return;
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const apiKey = process.env.GEMINI_API_KEY!;

    // Execute analysis once. progress logs are written to stream in real-time,
    // and final result is written once resolved.
    const finalResult = await runLiveAgentAnalysis(
      riskLevel,
      investmentGoal,
      horizon,
      undefined, // default macro signals
      apiKey,
      (log) => {
        // Stream each log chunk as it happens in real-time
        res.write(JSON.stringify({ type: 'log', log }) + '\n');
      },
      customPortfolio
    );

    // Send final result
    res.write(JSON.stringify({ type: 'result', result: finalResult }) + '\n');
    res.end();
  } catch (error) {
    next(error); // Forward to global error handler
  }
});

// Fallback to React Router for frontend client side routes if dist/index.html exists
app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If running in API-only mode (like on Render), return a simple status or 404
    if (req.path === '/') {
      res.json({ status: 'ok', message: 'Çalışkan Borsa API Server' });
    } else {
      res.status(404).json({ type: 'error', error: 'API endpoint bulunamadı.' });
    }
  }
});

// 5. Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] SERVER ERROR:`, err);
  
  // If headers already sent, delegate to standard Express handler
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({ 
    type: 'error', 
    error: 'Sunucuda içsel bir hata oluştu. Lütfen daha sonra tekrar deneyin.' 
  });
});

app.listen(PORT, () => {
  console.log(`Server is running in production mode on http://localhost:${PORT}`);
});
