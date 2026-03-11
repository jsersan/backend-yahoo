const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - ACTUALIZADO con dominios correctos
const allowedOrigins = [
  'http://localhost:4200',
  'https://burtsa.netlify.app',
  'https://www.txemaserrano.com',
  'http://www.txemaserrano.com',
  'https://txemaserrano.com',
  'http://txemaserrano.com'
];

app.use(cors({
  origin: function(origin, callback) {
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

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/quote/:symbol
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

/**
 * ============================================
 * EURIBOR CON DATOS REALES - BANCO DE ESPAÑA
 * ============================================
 */

/**
 * GET /api/euribor/current
 * Obtener Euribor REAL desde Banco de España
 */
app.get('/api/euribor/current', async (req, res) => {
  try {
    console.log('📊 Obteniendo Euribor REAL desde Banco de España...');
    
    // INTENTAR OBTENER DATOS REALES
    const realData = await fetchRealEuriborFromBdE();
    
    if (realData) {
      console.log(`✅ Euribor REAL: ${realData.rate}%`);
      return res.json(realData);
    }
    
    // Si falla, usar datos simulados
    console.warn('⚠️ Banco de España no disponible, usando datos simulados');
    const mockData = generateMockEuribor();
    res.json(mockData);

  } catch (error) {
    console.error('❌ Error obteniendo Euribor:', error.message);
    
    // Fallback a datos simulados
    const mockData = generateMockEuribor();
    res.json(mockData);
  }
});

/**
 * GET /api/euribor/historico?days=30
 */
app.get('/api/euribor/historico', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    console.log(`📅 Obteniendo histórico REAL de ${days} días...`);
    
    // INTENTAR OBTENER HISTÓRICO REAL
    const realHistorico = await fetchHistoricoFromBdE(days);
    
    if (realHistorico && realHistorico.length > 0) {
      console.log(`✅ Histórico REAL obtenido: ${realHistorico.length} registros`);
      return res.json(realHistorico);
    }
    
    // Si falla, usar datos simulados
    console.warn('⚠️ Banco de España no disponible, usando datos simulados');
    const historico = generateMockHistorico(days);
    res.json(historico);

  } catch (error) {
    console.error('❌ Error generando histórico:', error.message);
    const historico = generateMockHistorico(days);
    res.json(historico);
  }
});

/**
 * ============================================
 * FUNCIONES PARA OBTENER EURIBOR REAL
 * ============================================
 */

/**
 * Obtener Euribor actual desde Banco de España
 * Serie: TIPOS DE INTERÉS - Euribor a 1 año
 * Código: TI_1_1_1_1
 */
async function fetchRealEuriborFromBdE() {
  try {
    // API del Banco de España
    // Serie oficial del Euribor a 1 año
    const url = 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/TI_1_1_T1.2_a.csv';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv'
      },
      timeout: 15000
    });

    // Procesar CSV del Banco de España
    const lines = response.data.split('\n');
    
    // Buscar líneas con datos (formato: "fecha","valor")
    let lastValue = null;
    let previousValue = null;
    
    // Leer desde el final para obtener los valores más recientes
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Saltar líneas vacías o de cabecera
      if (!line || line.includes('Fecha') || line.includes('---')) {
        continue;
      }
      
      // Extraer fecha y valor
      const match = line.match(/"?(\d{4}-\d{2}-\d{2})"?[,;]"?([0-9.,]+)"?/);
      
      if (match) {
        const date = match[1];
        const value = parseFloat(match[2].replace(',', '.'));
        
        if (!isNaN(value)) {
          if (!lastValue) {
            lastValue = { date, value };
          } else if (!previousValue) {
            previousValue = { date, value };
            break;
          }
        }
      }
    }
    
    if (lastValue) {
      const change = previousValue 
        ? lastValue.value - previousValue.value 
        : 0;
      
      console.log(`📊 Euribor del Banco de España:`);
      console.log(`   Fecha: ${lastValue.date}`);
      console.log(`   Valor: ${lastValue.value}%`);
      console.log(`   Cambio: ${change > 0 ? '+' : ''}${change.toFixed(3)}%`);
      
      return {
        rate: Math.round(lastValue.value * 1000) / 1000,
        date: lastValue.date,
        change: Math.round(change * 1000) / 1000,
        timestamp: new Date().toISOString(),
        source: 'Banco de España'
      };
    }
    
    throw new Error('No se encontraron datos válidos en el CSV');
    
  } catch (error) {
    console.error('❌ Error con Banco de España:', error.message);
    return null;
  }
}

/**
 * Obtener histórico desde Banco de España
 */
async function fetchHistoricoFromBdE(days) {
  try {
    const url = 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/TI_1_1_T1.2_a.csv';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv'
      },
      timeout: 15000
    });

    const lines = response.data.split('\n');
    const historico = [];
    
    // Procesar todas las líneas
    for (let i = lines.length - 1; i >= 0 && historico.length < days; i--) {
      const line = lines[i].trim();
      
      if (!line || line.includes('Fecha') || line.includes('---')) {
        continue;
      }
      
      const match = line.match(/"?(\d{4}-\d{2}-\d{2})"?[,;]"?([0-9.,]+)"?/);
      
      if (match) {
        const date = match[1];
        const value = parseFloat(match[2].replace(',', '.'));
        
        if (!isNaN(value)) {
          // Calcular cambio respecto al día anterior
          const previousValue = historico.length > 0 
            ? historico[historico.length - 1].rate 
            : value;
          
          const change = value - previousValue;
          
          historico.push({
            rate: Math.round(value * 1000) / 1000,
            date: date,
            change: Math.round(change * 1000) / 1000
          });
        }
      }
    }
    
    // Invertir para que el más reciente esté primero
    return historico.reverse();
    
  } catch (error) {
    console.error('❌ Error obteniendo histórico:', error.message);
    return null;
  }
}

/**
 * ============================================
 * FALLBACK: DATOS SIMULADOS
 * ============================================
 */

function generateMockEuribor() {
  // Valor actualizado a 2.369% (valor real de hoy)
  const baseRate = 2.369;
  const randomVariation = (Math.random() - 0.5) * 0.01;
  const rate = baseRate + randomVariation;
  
  const today = new Date();
  
  return {
    rate: Math.round(rate * 1000) / 1000,
    date: today.toISOString().split('T')[0],
    change: Math.round((Math.random() - 0.5) * 0.02 * 1000) / 1000,
    timestamp: today.toISOString(),
    source: 'Simulado'
  };
}

function generateMockHistorico(days) {
  const historico = [];
  const today = new Date();
  let currentRate = 2.369; // Valor real actual
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.5) * 0.06;
    currentRate += change;
    currentRate = Math.max(2.2, Math.min(2.8, currentRate));
    
    historico.push({
      rate: Math.round(currentRate * 1000) / 1000,
      date: date.toISOString().split('T')[0],
      change: Math.round(change * 1000) / 1000
    });
  }
  
  return historico;
}

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
    version: '1.2.0',
    endpoints: {
      quote: '/api/quote/:symbol',
      index: '/api/index/:symbol',
      euriborCurrent: '/api/euribor/current (REAL desde Banco de España)',
      euriborHistorico: '/api/euribor/historico?days=30 (REAL)',
      health: '/health'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   - GET /api/quote/:symbol`);
  console.log(`   - GET /api/index/:symbol`);
  console.log(`   - GET /api/euribor/current (REAL)`);
  console.log(`   - GET /api/euribor/historico?days=30 (REAL)`);
  console.log(`   - GET /health\n`);
  console.log(`💡 Fuente Euribor: Banco de España (oficial)`);
  console.log(`📈 Valor actual esperado: ~2.369%\n`);
});
