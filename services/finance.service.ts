const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - ACTUALIZADO con dominios correctos
const allowedOrigins = [
  'http://localhost:4200',                              // Desarrollo local
  'https://burtsa.netlify.app',                         // Netlify
  'https://www.txemaserrano.com',                       // Tu dominio principal
  'http://www.txemaserrano.com',                        // HTTP (por si acaso)
  'https://txemaserrano.com',                           // Sin www
  'http://txemaserrano.com'                             // Sin www HTTP
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir peticiones sin origin (Postman, curl, apps móviles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`❌ CORS bloqueado: ${origin}`);
      return callback(new Error('CORS no permitido'), false);
    }
    
    console.log(`✅ CORS permitido: ${origin}`);
    return callback(null, true);
  },
  credentials: true
}));

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/quote/:symbol
 * Obtener cotización de una acción
 */
app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    console.log(`📊 Obteniendo: ${symbol}`);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];

    const data = {
      c: meta.regularMarketPrice,
      d: meta.regularMarketPrice - meta.chartPreviousClose,
      dp: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      h: quote.high[quote.high.length - 1] || meta.regularMarketPrice,
      l: quote.low[quote.low.length - 1] || meta.regularMarketPrice,
      o: quote.open[0] || meta.regularMarketPrice,
      pc: meta.chartPreviousClose,
      t: meta.regularMarketTime,
      volume: quote.volume[quote.volume.length - 1] || 0
    };

    console.log(`✅ ${symbol}: ${data.c}`);
    res.json(data);

  } catch (error) {
    console.error(`❌ Error obteniendo ${symbol}:`, error.message);
    res.status(500).json({ 
      error: 'No se pudo obtener la cotización',
      symbol,
      message: error.message
    });
  }
});

/**
 * GET /api/index/:symbol
 * Obtener datos de índice
 */
app.get('/api/index/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    console.log(`📈 Obteniendo índice: ${symbol}`);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const result = response.data.chart.result[0];
    const meta = result.meta;

    const data = {
      name: symbol,
      value: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.chartPreviousClose,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString()
    };

    console.log(`✅ ${symbol}: ${data.value}`);
    res.json(data);

  } catch (error) {
    console.error(`❌ Error obteniendo índice ${symbol}:`, error.message);
    res.status(500).json({ 
      error: 'No se pudo obtener el índice',
      symbol,
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    name: 'Burtsa Backend API',
    version: '1.0.0',
    endpoints: {
      quote: '/api/quote/:symbol',
      index: '/api/index/:symbol',
      health: '/health'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   - GET /api/quote/:symbol`);
  console.log(`   - GET /api/index/:symbol`);
  console.log(`   - GET /health\n`);
});
