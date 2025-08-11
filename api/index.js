const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');

let app;

async function createNestApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });

    // Set up logger
    const { WINSTON_MODULE_NEST_PROVIDER } = require('nest-winston');
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    // Apply the same configuration as in main.ts
    const { ValidationPipe } = require('@nestjs/common');
    const helmet = require('helmet');
    const compression = require('compression');

    // Security middleware with CSP configuration for UI
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Allow inline scripts for UI
            "https://cdn.jsdelivr.net", // Bootstrap CDN
            "https://cdnjs.cloudflare.com", // Font Awesome and other CDNs
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Allow inline styles
            "https://cdn.jsdelivr.net", // Bootstrap CSS
            "https://cdnjs.cloudflare.com", // Font Awesome CSS
            "https://fonts.googleapis.com", // Google Fonts
          ],
          fontSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com", // Font Awesome fonts
            "https://fonts.gstatic.com", // Google Fonts
          ],
          imgSrc: [
            "'self'",
            "data:", // Allow data URLs for images
            "https:", // Allow HTTPS images
          ],
          connectSrc: [
            "'self'", // Allow API calls to same origin
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }));
    app.use(compression());

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // API prefix - exclude static routes and health checks
    app.setGlobalPrefix('api/v1', {
      exclude: [
        '/ui/(.*)',
        '/health',
        '/swagger/(.*)',
        '/',
        '/admin'
      ]
    });

    // Setup Swagger documentation
    const { setupSwagger } = require('../dist/src/common/config/swagger.config');
    setupSwagger(app);

    await app.init();
  }
  return app;
}

module.exports = async (req, res) => {
  try {
    const nestApp = await createNestApp();
    return nestApp.getHttpAdapter().getInstance()(req, res);
  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
