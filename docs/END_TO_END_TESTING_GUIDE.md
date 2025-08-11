# 🚀 End-to-End Testing Guide
## Payment Processing Analytics Platform

This comprehensive guide will walk you through testing the entire Payment Processing Platform from initial setup to advanced API testing using Swagger UI.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**
- **Git**
- A modern web browser (Chrome, Firefox, Safari, Edge)

---

## 🛠️ Phase 1: Initial Setup

### Step 1: Database Setup

1. **Run the automated setup script:**
   ```bash
   ./scripts/setup-database.sh
   ```
   
   This script will:
   - Check if PostgreSQL is installed and running
   - Create the database user `payment_user`
   - Create the database `payment_processing`
   - Set up proper permissions

2. **Manual setup (if script fails):**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create user and database
   CREATE USER payment_user WITH PASSWORD 'payment_password';
   CREATE DATABASE payment_processing OWNER payment_user;
   GRANT ALL PRIVILEGES ON DATABASE payment_processing TO payment_user;
   ```

### Step 2: Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your settings:**
   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=payment_user
   DATABASE_PASSWORD=payment_password
   DATABASE_NAME=payment_processing
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Application Configuration
   NODE_ENV=development
   PORT=3000
   API_PREFIX=api/v1
   
   # Security Configuration
   BCRYPT_ROUNDS=12
   RATE_LIMIT_TTL=60
   RATE_LIMIT_LIMIT=100
   
   # PCI Compliance Simulation
   ENCRYPTION_KEY=your-32-character-encryption-key-here
   AUDIT_LOG_RETENTION_DAYS=2555
   
   # Analytics Configuration
   ANALYTICS_BATCH_SIZE=1000
   ANALYTICS_REFRESH_INTERVAL=30000
   
   # Merchant Onboarding
   KYC_VERIFICATION_TIMEOUT=300000
   DOCUMENT_UPLOAD_MAX_SIZE=10485760
   ```

### Step 3: Install Dependencies and Build

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the application:**
   ```bash
   npm run start:dev
   ```

4. **Verify the application is running:**
   - You should see: `🚀 Payment Processing Platform is running on: http://localhost:3000/api/v1`
   - And: `📚 API Documentation available at: http://localhost:3000/swagger/docs`

---

## 📚 Phase 2: Swagger UI Overview

### Accessing Swagger Documentation

1. **Open your browser and navigate to:**
   ```
   http://localhost:3000/swagger/docs
   ```

2. **You should see the standard Swagger UI with:**
   - **Header**: Payment Processing Analytics Platform title
   - **Authorization Section**: "Authorize" button for JWT authentication
   - **API Categories**: Organized sections:
     - Authentication
     - Merchants
     - Transactions
     - Analytics
     - Security
     - Audit
     - Tenants
     - Users
     - Health

### Understanding the Interface

- **Try it out**: Blue button to test endpoints interactively
- **Execute**: Blue button to send requests
- **Authorize**: Green button for authentication
- **Schemas**: Expandable models showing request/response structures
- **Examples**: Real-world data examples for each endpoint

---

## 🧪 Phase 3: Step-by-Step API Testing

### Test 1: Authentication Flow

#### 1.1 User Registration

1. **Navigate to Authentication section**
2. **Find `POST /auth/register`**
3. **Click "Try it out"**
4. **Enter test data:**
   ```json
   {
     "email": "test@example.com",
     "firstName": "John",
     "lastName": "Doe",
     "password": "SecurePassword123!",
     "role": "merchant_user",
     "phoneNumber": "+1-555-123-4567",
     "timezone": "America/New_York"
   }
   ```
5. **Click "Execute"**
6. **Expected Response (201):**
   ```json
   {
     "user": {
       "id": "uuid",
       "email": "test@example.com",
       "firstName": "John",
       "lastName": "Doe",
       "role": "merchant_user",
       "status": "active"
     },
     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
     "expiresIn": 86400
   }
   ```

#### 1.2 User Login

1. **Find `POST /auth/login`**
2. **Click "Try it out"**
3. **Enter credentials:**
   ```json
   {
     "email": "test@example.com",
     "password": "SecurePassword123!"
   }
   ```
4. **Click "Execute"**
5. **Copy the `accessToken` from the response**

#### 1.3 Set Up Authentication

1. **Click the "Authorize" button (green, top right)**
2. **In the JWT-auth field, enter:**
   ```
   Bearer YOUR_ACCESS_TOKEN_HERE
   ```
3. **Click "Authorize"**
4. **Click "Close"**

Now all protected endpoints will include your JWT token automatically!

### Test 2: Merchant Management

#### 2.1 Create a Merchant

1. **Navigate to Merchants section**
2. **Find `POST /merchants`**
3. **Click "Try it out"**
4. **Enter merchant data:**
   ```json
   {
     "businessName": "Test Coffee Shop",
     "contactEmail": "owner@testcoffee.com",
     "contactPhone": "+1-555-987-6543",
     "businessAddress": {
       "street": "123 Main St",
       "city": "New York",
       "state": "NY",
       "zipCode": "10001",
       "country": "US"
     },
     "businessType": "retail",
     "website": "https://testcoffee.com",
     "description": "A cozy coffee shop in downtown"
   }
   ```
5. **Click "Execute"**
6. **Save the merchant ID from the response**

#### 2.2 Get All Merchants

1. **Find `GET /merchants`**
2. **Click "Try it out"**
3. **Click "Execute"**
4. **Verify your created merchant appears in the list**

#### 2.3 Get Merchant by ID

1. **Find `GET /merchants/{id}`**
2. **Click "Try it out"**
3. **Enter the merchant ID from step 2.1**
4. **Click "Execute"**
5. **Verify detailed merchant information is returned**

### Test 3: Transaction Processing

#### 3.1 Create a Transaction

1. **Navigate to Transactions section**
2. **Find `POST /transactions`**
3. **Click "Try it out"**
4. **Enter transaction data:**
   ```json
   {
     "merchantId": "YOUR_MERCHANT_ID_FROM_STEP_2.1",
     "amount": 29.99,
     "currency": "USD",
     "paymentMethod": "credit_card",
     "customerEmail": "customer@example.com",
     "description": "Coffee and pastry purchase",
     "metadata": {
       "orderId": "ORDER-001",
       "items": ["Latte", "Croissant"]
     }
   }
   ```
5. **Click "Execute"**
6. **Expected Response (201):**
   - Transaction ID
   - Status: "pending" or "processing"
   - Risk assessment details
   - Timestamp information

#### 3.2 Get Transaction History

1. **Find `GET /transactions`**
2. **Click "Try it out"**
3. **Optionally add query parameters:**
   - `page`: 1
   - `limit`: 10
   - `status`: "completed"
4. **Click "Execute"**
5. **Verify paginated transaction list**

### Test 4: Analytics and Reporting

#### 4.1 Get Real-time Analytics

1. **Navigate to Analytics section**
2. **Find `GET /analytics/realtime`**
3. **Click "Try it out"**
4. **Click "Execute"**
5. **Expected Response:**
   ```json
   {
     "transactionVolume": {
       "total": 1500.50,
       "count": 25,
       "averageAmount": 60.02
     },
     "merchantMetrics": {
       "totalMerchants": 5,
       "activeMerchants": 4,
       "pendingApprovals": 1
     },
     "riskMetrics": {
       "averageRiskScore": 0.25,
       "highRiskTransactions": 2,
       "flaggedTransactions": 1
     }
   }
   ```

#### 4.2 Get KPI Dashboard

1. **Find `GET /analytics/kpis`**
2. **Click "Try it out"**
3. **Add date range (optional):**
   - `startDate`: "2024-01-01T00:00:00.000Z"
   - `endDate`: "2024-12-31T23:59:59.999Z"
4. **Click "Execute"**
5. **Review comprehensive KPI data**

---

## 🔍 Phase 4: Advanced Testing Scenarios

### Scenario 1: Complete Merchant Onboarding

1. **Create merchant** (already done in Test 2.1)
2. **Start KYC process:**
   - `POST /merchants/{id}/kyc/start`
3. **Upload KYC documents:**
   - `POST /merchants/{id}/kyc/documents`
4. **Approve merchant:**
   - `POST /merchants/{id}/approve`
5. **Activate merchant:**
   - `POST /merchants/{id}/activate`

### Scenario 2: Transaction Lifecycle

1. **Create transaction** (already done in Test 3.1)
2. **Process refund:**
   - `POST /transactions/{id}/refund`
3. **Check transaction status:**
   - `GET /transactions/{id}`
4. **View audit trail:**
   - `GET /audit/logs?entityType=Transaction&entityId={id}`

### Scenario 3: Security and Compliance

1. **Run PCI compliance scan:**
   - `POST /security/pci/scan`
2. **Get compliance report:**
   - `GET /security/pci/report`
3. **View security events:**
   - `GET /audit/security-events`

---

## 🐛 Phase 5: Error Testing

### Test Error Scenarios

1. **Invalid Authentication:**
   - Remove JWT token and try protected endpoints
   - Expected: 401 Unauthorized

2. **Validation Errors:**
   - Send invalid email format in registration
   - Expected: 400 Bad Request with validation details

3. **Not Found Errors:**
   - Request non-existent merchant ID
   - Expected: 404 Not Found

4. **Rate Limiting:**
   - Make rapid requests to test throttling
   - Expected: 429 Too Many Requests

---

## ✅ Phase 6: Verification Checklist

### Functional Testing
- [ ] User registration works
- [ ] User login returns valid JWT
- [ ] JWT authentication protects endpoints
- [ ] Merchant creation and management
- [ ] Transaction processing
- [ ] Analytics data retrieval
- [ ] Error handling works correctly

### UI/UX Testing
- [ ] Swagger UI loads properly
- [ ] CSS styling looks professional
- [ ] All endpoints are documented
- [ ] Try-it-out functionality works
- [ ] Response examples are clear
- [ ] Authorization persists across requests

### Performance Testing
- [ ] API responses are fast (< 1 second)
- [ ] Database connections are stable
- [ ] No memory leaks during testing
- [ ] Rate limiting works as expected

---

## 🎯 Success Criteria

You've successfully tested the platform when:

1. ✅ **All authentication flows work**
2. ✅ **CRUD operations function for all entities**
3. ✅ **Real-time analytics return data**
4. ✅ **Error handling is comprehensive**
5. ✅ **Swagger UI is fully functional and well-styled**
6. ✅ **Security features are operational**
7. ✅ **Database operations are stable**

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env` file
- Ensure database exists: `psql -U payment_user -d payment_processing`

**JWT Token Issues:**
- Check JWT_SECRET is set in `.env`
- Verify token format: `Bearer <token>`
- Check token expiration

**Swagger UI Not Loading:**
- Verify application is running on correct port
- Check browser console for errors
- Clear browser cache

**API Endpoints Not Working:**
- Check application logs for errors
- Verify database migrations ran
- Confirm all dependencies are installed

---

## 📞 Support

If you encounter issues:
1. Check the application logs
2. Review the troubleshooting section
3. Verify all prerequisites are met
4. Check environment configuration

Happy testing! 🎉

---

## 📋 Quick Reference Card

### Essential URLs
- **Swagger UI**: http://localhost:3000/swagger/docs
- **OpenAPI JSON**: http://localhost:3000/swagger/docs-json
- **Health Check**: http://localhost:3000/api/v1/health/simple

### Test Data Templates

**User Registration:**
```json
{
  "email": "test@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "role": "merchant_user"
}
```

**Merchant Creation:**
```json
{
  "businessName": "Test Business",
  "contactEmail": "business@test.com",
  "contactPhone": "+1-555-123-4567",
  "businessAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "businessType": "retail"
}
```

**Transaction Creation:**
```json
{
  "merchantId": "MERCHANT_UUID_HERE",
  "amount": 29.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "customerEmail": "customer@example.com",
  "description": "Test purchase"
}
```

### Quick Commands
```bash
# Setup database
./scripts/setup-database.sh

# Install and start
npm install
npm run build
npm run start:dev

# Check if running
curl http://localhost:3000/api/v1/health/simple
```
