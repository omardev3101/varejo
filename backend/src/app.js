const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
console.log('Backend Restarted at:', new Date().toISOString());

// 1. Security Headers via Helmet
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true
}));

// 2. Strict CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Origem não permitida pela política de CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// 3. Rate Limiting (DDoS & Brute-Force Protection)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // Máximo de 300 requisições por IP a cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições enviadas deste IP. Por favor, tente novamente mais tarde.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // Máximo de 15 tentativas de login por IP a cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login a partir deste IP. Bloqueio temporário de 15 minutos.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(require('express-fileupload')({
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
    abortOnLimit: true
}));
const uploadsFolder = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsFolder));
app.use('/varejo/uploads', express.static(uploadsFolder));
app.use('/api/uploads', express.static(uploadsFolder));
app.use('/varejo/api/uploads', express.static(uploadsFolder));

const sequelize = require('./config/database');
require('./models'); // Load associations

const FiscalController = require('./controllers/FiscalController');
const authMiddleware = require('./middlewares/auth');

// ABSOLUTE TOP ROUTES FOR DEBUGGING
app.get('/api/nfe/data/:saleId', authMiddleware, (req, res, next) => {
    console.log('DEBUG TOP: /api/nfe/data/:saleId reached. ID:', req.params.saleId);
    FiscalController.getFiscalData(req, res, next);
});

app.post('/api/nfe/:saleId/emit', authMiddleware, (req, res, next) => {
    console.log('POST /api/nfe/:saleId/emit hit');
    FiscalController.emitNFCe(req, res, next);
});

app.get('/api/nfe/test', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/cashier', require('./routes/cashier.routes'));
app.use('/api/financial', require('./routes/financial.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/roles', require('./routes/role.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/expedition', require('./routes/expedition.routes'));
app.use('/api/terminals', authMiddleware, require('./routes/terminal.routes'));
app.use('/api/tenants', authMiddleware, require('./routes/tenant.routes'));
app.use('/api/returns', require('./routes/returnsRoutes'));
app.use('/api/transfers', require('./routes/transfersRoutes'));
app.use('/api/fiscal', authMiddleware, require('./routes/fiscal.routes'));
app.use('/api/socio', require('./routes/socio.routes'));
app.use('/api/storefront-config', require('./routes/storeConfig.routes'));
app.use('/api/pix', require('./routes/pix.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

const { sanitizeErrorMessage } = require('./utils/errorSanitizer');

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Secure Error Handler (Sanitizes SQL and technical error details)
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR_STACK:', err.stack || err.message);
    const status = err.status || err.statusCode || 500;
    const responseError = sanitizeErrorMessage(err);
    res.status(status).json({ error: responseError });
});

// VPS Crash Guards (Prevents process termination from unhandled rejections)
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED_REJECTION_LOG:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT_EXCEPTION_LOG:', err);
});

// Start Automated Backup & Health Monitoring Scheduler
const BackupService = require('./services/BackupService');
BackupService.startScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
