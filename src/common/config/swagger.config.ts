import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Payment Processing Analytics Platform')
    .setDescription(`
      # Payment Processing Analytics Platform API

      A comprehensive payments analytics platform with multi-tenant architecture designed for modern payment processing needs.
      
      ## 🚀 Features
      - **Multi-tenant Architecture**: Secure tenant isolation for enterprise clients
      - **Real-time Payment Processing**: High-performance transaction processing
      - **Advanced Analytics**: Real-time KPIs, reporting, and business intelligence
      - **Fraud Detection**: AI-powered risk assessment and fraud prevention
      - **PCI DSS Compliance**: Built-in compliance monitoring and reporting
      - **Merchant Management**: Complete merchant onboarding and KYC workflows
      - **Comprehensive Audit**: Full audit trail for compliance and security
      
      ## 🔐 Authentication
      This API uses **JWT Bearer token** authentication. To authenticate:
      
      1. Register or login to get an access token
      2. Include the token in the Authorization header: \`Authorization: Bearer <your-jwt-token>\`
      3. Tokens expire after a configured time period - use the refresh endpoint to get new tokens
      
      ## 🏢 Multi-tenancy
      All API endpoints operate within a tenant context:
      - Tenant ID is automatically extracted from the JWT token
      - All data is isolated by tenant for security and compliance
      - Cross-tenant access is strictly prohibited
      
      ## 📊 Pagination
      List endpoints support pagination with the following query parameters:
      - \`page\`: Page number (1-based, default: 1)
      - \`limit\`: Items per page (max: 100, default: 20)
      
      ## 🔍 Filtering
      Most list endpoints support filtering with query parameters:
      - Date ranges: \`startDate\` and \`endDate\` (ISO 8601 format)
      - Status filters: \`status\` (enum values)
      - Search: \`search\` (text search where applicable)
      
      ## ⚡ Rate Limiting
      API endpoints are rate-limited to ensure system stability:
      - Authentication endpoints: 5 requests per minute
      - General endpoints: 100 requests per minute
      - Bulk operations: 10 requests per minute
      
      ## 📈 Response Format
      All API responses follow a consistent format:
      \`\`\`json
      {
        "success": true,
        "message": "Operation completed successfully",
        "data": { ... },
        "timestamp": "2024-01-01T00:00:00.000Z",
        "requestId": "uuid"
      }
      \`\`\`
      
      ## 🚨 Error Handling
      Error responses include detailed information:
      \`\`\`json
      {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": "Detailed error description",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "path": "/api/v1/endpoint",
        "validationErrors": ["field1 is required"]
      }
      \`\`\`
      
      ## 📞 Support
      For API support and questions:
      - Email: api-support@paymentplatform.com
      - Documentation: https://docs.paymentplatform.com
      - Status Page: https://status.paymentplatform.com
    `)
    .setVersion('1.0.0')

    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )

    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Merchants', 'Merchant onboarding, KYC, and management')
    .addTag('Transactions', 'Transaction processing, refunds, and management')
    .addTag('Analytics', 'Real-time analytics, KPIs, and reporting')
    .addTag('Security', 'Security monitoring, compliance, and audit')
    .addTag('Audit', 'Audit logging and compliance tracking')
    .addTag('Tenants', 'Multi-tenant management and configuration')
    .addTag('Users', 'User management and profile operations')
    .addTag('Health', 'System health and monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Enhanced Swagger UI setup with custom styling
  SwaggerModule.setup('swagger/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      showRequestDuration: true,
    },
    customSiteTitle: 'Payment Processing Platform - API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 15px 0;
      }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info {
        margin: 30px 0;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        padding: 30px;
        border-radius: 15px;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      }
      .swagger-ui .info .title {
        color: white;
        font-size: 2.5rem;
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        margin-bottom: 20px;
      }
      .swagger-ui .info .description {
        color: rgba(255,255,255,0.95);
        font-size: 1.1rem;
        line-height: 1.6;
      }
      .swagger-ui .info .description h2 {
        color: white;
        border-bottom: 2px solid rgba(255,255,255,0.3);
        padding-bottom: 10px;
        margin-top: 25px;
        font-weight: 600;
      }
      .swagger-ui .info .description code {
        background: rgba(255,255,255,0.2);
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
        font-weight: 600;
      }
      .swagger-ui .scheme-container {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        padding: 25px;
        border-radius: 15px;
        margin: 25px 0;
        color: white;
      }
      .swagger-ui .btn.authorize {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        color: white;
        font-size: 1.1rem;
        transition: all 0.3s ease;
      }
      .swagger-ui .btn.authorize:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      }
      .swagger-ui .opblock.opblock-post {
        border-color: #49cc90;
        background: rgba(73, 204, 144, 0.1);
        border-radius: 10px;
        margin-bottom: 15px;
      }
      .swagger-ui .opblock.opblock-get {
        border-color: #61affe;
        background: rgba(97, 175, 254, 0.1);
        border-radius: 10px;
        margin-bottom: 15px;
      }
      .swagger-ui .opblock.opblock-put {
        border-color: #fca130;
        background: rgba(252, 161, 48, 0.1);
        border-radius: 10px;
        margin-bottom: 15px;
      }
      .swagger-ui .opblock.opblock-delete {
        border-color: #f93e3e;
        background: rgba(249, 62, 62, 0.1);
        border-radius: 10px;
        margin-bottom: 15px;
      }
      .swagger-ui .opblock-summary {
        font-weight: 600;
        font-size: 1.1rem;
      }
      .swagger-ui .opblock-tag {
        font-size: 1.4rem;
        font-weight: 700;
        color: #3b4151;
        margin: 40px 0 20px 0;
        padding: 20px 0;
        border-bottom: 3px solid #e3e3e3;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 20px;
        border-radius: 10px;
      }
      .swagger-ui .btn.execute {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-weight: 600;
        color: white;
        font-size: 1.1rem;
        transition: all 0.3s ease;
      }
      .swagger-ui .btn.execute:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      }
      .swagger-ui .highlight-code {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 20px;
        border: 1px solid #e9ecef;
      }
      .swagger-ui .model {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 20px;
        border: 1px solid #e9ecef;
      }
      .swagger-ui .response .response-col_description {
        font-weight: 600;
        color: #3b4151;
      }
      .swagger-ui .parameter__name {
        font-weight: 600;
        color: #3b4151;
      }
      .swagger-ui .prop-type {
        color: #3b4151;
        font-weight: 600;
      }
      .swagger-ui .response-col_status {
        font-weight: 700;
      }
      body {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        min-height: 100vh;
      }
      .swagger-ui .wrapper {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
    `,
    customJs: `
      window.addEventListener('load', function() {
        // Add platform navigation to topbar
        const topbar = document.querySelector('.swagger-ui .topbar');
        if (topbar) {
          topbar.innerHTML = \`
            <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px;">
              <div style="color: white; font-weight: 700; font-size: 1.3rem;">
                <i class="fas fa-credit-card" style="margin-right: 10px;"></i>
                Payment Processing Platform - API Documentation
              </div>
              <div>
                <a href="/ui" style="color: white; text-decoration: none; margin: 0 15px; font-weight: 500; padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.2); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🏠 Home</a>
                <a href="/ui/admin" style="color: white; text-decoration: none; margin: 0 15px; font-weight: 500; padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.2); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">📊 Dashboard</a>
                <a href="/ui/demo" style="color: white; text-decoration: none; margin: 0 15px; font-weight: 500; padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.2); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🎮 Demo</a>
              </div>
            </div>
          \`;
        }

        // Add Font Awesome for icons
        if (!document.querySelector('link[href*="font-awesome"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
          document.head.appendChild(link);
        }

        // Add quick links to description
        const description = document.querySelector('.swagger-ui .info .description');
        if (description) {
          const quickLinks = document.createElement('div');
          quickLinks.innerHTML = \`
            <h2>🔗 Quick Links</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px;">
              <a href="/ui" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🏠 Platform Home</a>
              <a href="/ui/admin" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">📊 Admin Dashboard</a>
              <a href="/ui/demo" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🎮 Interactive Demo</a>
              <a href="/docs/END_TO_END_TESTING_GUIDE.md" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">📋 Testing Guide</a>
            </div>
          \`;
          description.appendChild(quickLinks);
        }
      });
    `,
  });
}
