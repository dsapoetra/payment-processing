# 🚀 Vercel Deployment Setup Guide
## Payment Processing Platform

This guide will help you configure your Payment Processing Platform on Vercel with a cloud database.

---

## 📋 Step 1: Set Up Database (Choose One)

### Option A: Neon (Recommended - Free Tier Available)

1. **Go to [Neon](https://neon.tech)** and create a free account
2. **Create a new project** called "payment-processing"
3. **Copy the connection string** (it looks like: `postgresql://username:password@host/database?sslmode=require`)
4. **Save these details** for the next step

### Option B: Supabase (Alternative)

1. **Go to [Supabase](https://supabase.com)** and create a free account
2. **Create a new project** called "payment-processing"
3. **Go to Settings > Database** and copy the connection string
4. **Save these details** for the next step

### Option C: Railway (Alternative)

1. **Go to [Railway](https://railway.app)** and create a free account
2. **Create a new project** and add a PostgreSQL database
3. **Copy the connection details** from the database service
4. **Save these details** for the next step

---

## 📋 Step 2: Configure Vercel Environment Variables

1. **Go to your Vercel dashboard** → Your project → Settings → Environment Variables

2. **Add these environment variables:**

```bash
# Database Configuration (use your database connection details)
DATABASE_HOST=your-database-host
DATABASE_PORT=5432
DATABASE_USERNAME=your-database-username
DATABASE_PASSWORD=your-database-password
DATABASE_NAME=your-database-name

# JWT Configuration (generate secure secrets)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-also-long-and-random
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Security Configuration
BCRYPT_ROUNDS=10
ENCRYPTION_KEY=your-32-character-encryption-key-here-exactly-32-chars
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# Logging
LOG_LEVEL=info
LOG_CONSOLE=true
SERVERLESS=true
```

3. **Click "Save" after adding each variable**

---

## 📋 Step 3: Deploy and Create Your First Tenant

1. **Deploy your application** (push to GitHub if auto-deploy is enabled)

2. **Wait for deployment to complete**

3. **Create your first tenant and admin user** by making a POST request to:
   ```
   https://your-app.vercel.app/api/v1/auth/public-register
   ```

---

## 📋 Step 4: Test Your Setup

### Create Your Organization (Tenant)

Use this curl command or Postman to create your first tenant:

```bash
curl -X POST https://your-app.vercel.app/api/v1/auth/public-register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "firstName": "Your",
    "lastName": "Name",
    "password": "SecurePassword123!",
    "phoneNumber": "+1-555-123-4567",
    "organizationName": "Your Company Name",
    "organizationType": "business",
    "industry": "technology",
    "website": "https://yourcompany.com",
    "description": "Your company description"
  }'
```

**Replace the values with your actual information:**
- `email`: Your admin email
- `firstName` & `lastName`: Your name
- `password`: A secure password (min 8 chars, uppercase, lowercase, number, special char)
- `organizationName`: Your company name (this becomes the subdomain)
- Other fields are optional

### Expected Response

You should get a response like:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@yourcompany.com",
    "firstName": "Your",
    "lastName": "Name",
    "role": "tenant_admin",
    "status": "active"
  },
  "tenant": {
    "id": "uuid-here",
    "name": "Your Company Name",
    "subdomain": "your-company-name",
    "plan": "starter",
    "apiKey": "pk_generated-api-key-here"
  },
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "expiresIn": 86400
}
```

**Save the `apiKey` and `subdomain`** - you'll need these!

---

## 📋 Step 5: Access Your Application

After creating your tenant, you can access your application in several ways:

### Method 1: Using API Key Header
Add this header to your requests:
```
X-API-Key: pk_your-generated-api-key-here
```

### Method 2: Using Tenant ID Header
Add this header to your requests:
```
X-Tenant-ID: your-tenant-uuid-here
```

### Method 3: Using Subdomain (if you have a custom domain)
If you set up a custom domain, you can use:
```
https://your-subdomain.yourdomain.com
```

---

## 📋 Step 6: Test Your Endpoints

Now you can test these endpoints:

1. **Health Check:**
   ```
   GET https://your-app.vercel.app/api/v1/health
   Headers: X-API-Key: pk_your-api-key
   ```

2. **Admin Interface:**
   ```
   GET https://your-app.vercel.app/ui/admin
   Headers: X-API-Key: pk_your-api-key
   ```

3. **Swagger Documentation:**
   ```
   GET https://your-app.vercel.app/swagger
   Headers: X-API-Key: pk_your-api-key
   ```

4. **Login:**
   ```
   POST https://your-app.vercel.app/api/v1/auth/public-login
   Body: {
     "email": "admin@yourcompany.com",
     "password": "SecurePassword123!"
   }
   ```

---

## 🎉 You're All Set!

Your Payment Processing Platform is now configured and ready to use on Vercel!

### Next Steps:
- Create merchants using the API
- Set up payment processing
- Explore the admin interface
- Check out the Swagger documentation for all available endpoints

### Need Help?
- Check the application logs in Vercel dashboard
- Use the health check endpoint to verify everything is working
- Review the Swagger documentation for API details
