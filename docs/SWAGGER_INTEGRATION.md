# Swagger API Documentation Integration

This document describes the comprehensive Swagger/OpenAPI integration for the Payment Processing Analytics Platform.

## 🚀 Overview

The Payment Processing Platform now includes a fully integrated Swagger/OpenAPI documentation system that provides:

- **Interactive API Documentation**: Complete API reference with try-it-out functionality
- **Authentication Support**: JWT Bearer token authentication with persistent authorization
- **Comprehensive Schemas**: Detailed request/response models with validation rules
- **Multi-environment Support**: Development, staging, and production server configurations
- **Enhanced UI**: Custom styling and improved user experience

## 📚 Accessing the Documentation

Once the application is running, you can access the Swagger documentation at:

- **Development**: `http://localhost:3000/api/v1/docs`
- **Staging**: `https://api-staging.paymentplatform.com/api/v1/docs`
- **Production**: `https://api.paymentplatform.com/api/v1/docs`

### Additional Endpoints

- **OpenAPI JSON**: `http://localhost:3000/api/v1/docs-json`
- **OpenAPI YAML**: `http://localhost:3000/api/v1/docs-yaml`

## 🔧 Configuration

### Main Configuration

The Swagger configuration is centralized in `src/common/config/swagger.config.ts`:

```typescript
import { setupSwagger } from './common/config/swagger.config';

// In main.ts
setupSwagger(app, apiPrefix, port);
```

### Key Features

1. **Comprehensive Documentation**
   - Detailed API descriptions
   - Request/response examples
   - Error response schemas
   - Authentication requirements

2. **Enhanced Security**
   - JWT Bearer token support
   - API Key authentication
   - Persistent authorization

3. **Developer Experience**
   - Interactive try-it-out functionality
   - Request duration display
   - Collapsible sections
   - Search and filter capabilities

## 📋 API Categories

The documentation is organized into the following categories:

### 🔐 Authentication
- User registration and login
- Token refresh and logout
- Profile management

### 🏪 Merchants
- Merchant onboarding
- KYC process management
- Status updates and approvals

### 💳 Transactions
- Payment processing
- Refunds and cancellations
- Transaction analytics

### 📊 Analytics
- Real-time KPIs
- Business intelligence
- Custom reporting

### 🛡️ Security
- PCI DSS compliance monitoring
- Security scans and assessments
- Vulnerability management

### 📋 Audit
- Comprehensive audit logging
- Compliance tracking
- Security event monitoring

### 🏢 Tenants
- Multi-tenant management
- Configuration and settings

### 👥 Users
- User management
- Role-based access control

## 🎨 Custom Styling

The Swagger UI includes custom styling for better user experience:

- Hidden top bar for cleaner interface
- Custom color scheme matching brand guidelines
- Enhanced button styling
- Improved layout and spacing

## 🔒 Authentication in Swagger

To test authenticated endpoints:

1. Click the **"Authorize"** button in the top right
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click **"Authorize"**
4. The token will be automatically included in all requests

## 📝 Response Models

All endpoints include comprehensive response models:

### Success Responses
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

### Error Responses
```json
{
  "code": "ERROR_CODE",
  "message": "Error description",
  "details": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint",
  "validationErrors": ["field1 is required"]
}
```

### Paginated Responses
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "hasNext": true,
  "hasPrev": false
}
```

## 🛠️ Development Guidelines

### Adding New Endpoints

When adding new endpoints, ensure you include:

1. **Comprehensive decorators**:
   ```typescript
   @ApiOperation({ 
     summary: 'Brief description',
     description: 'Detailed description with examples'
   })
   @ApiBody({ type: RequestDto })
   @ApiOkResponse({ 
     description: 'Success response',
     type: ResponseDto 
   })
   @ApiBadRequestResponse({ 
     description: 'Validation error',
     type: ErrorResponseDto 
   })
   ```

2. **Proper DTOs** with validation decorators:
   ```typescript
   export class CreateItemDto {
     @ApiProperty({ 
       description: 'Item name',
       example: 'Sample Item',
       minLength: 1,
       maxLength: 100
     })
     @IsString()
     @MinLength(1)
     @MaxLength(100)
     name: string;
   }
   ```

3. **Response models** for consistent documentation:
   ```typescript
   export class ItemResponseDto {
     @ApiProperty({ description: 'Item ID', format: 'uuid' })
     id: string;
     
     @ApiProperty({ description: 'Item name' })
     name: string;
   }
   ```

## 🚀 Next Steps

1. **Database Setup**: Configure PostgreSQL database to run the application
2. **Environment Variables**: Set up required environment variables
3. **Testing**: Use Swagger UI to test all endpoints
4. **Integration**: Integrate with frontend applications using the OpenAPI specification

## 📞 Support

For questions about the API documentation:
- Email: api-support@paymentplatform.com
- Documentation: https://docs.paymentplatform.com
- GitHub Issues: Create an issue in the repository

## 🔄 Updates

The Swagger documentation is automatically updated when:
- New endpoints are added
- DTOs are modified
- Response schemas change
- API descriptions are updated

The documentation stays in sync with the codebase through TypeScript decorators and automatic schema generation.
