import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { AppLoggerService } from './common/services/logger.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Set up logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = app.get(AppLoggerService);
  const configService = app.get(ConfigService);

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

  // API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Setup Swagger documentation
  setupSwagger(app);

  const port = configService.get('PORT', 3000);

  try {
    await app.listen(port);

    logger.logSystemEvent(
      `🚀 Payment Processing Platform started successfully`,
      'application_start',
      {
        port,
        apiPrefix,
        environment: configService.get('NODE_ENV', 'development'),
        nodeVersion: process.version,
        platform: process.platform,
      }
    );

    logger.log(`🚀 Payment Processing Platform is running on: http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
    logger.log(`📚 API Documentation available at: http://localhost:${port}/swagger/docs`, 'Bootstrap');
  } catch (error) {
    logger.error('Failed to start application', error.stack, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
