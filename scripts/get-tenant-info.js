#!/usr/bin/env node

/**
 * Get Tenant Info Script
 * 
 * This script helps you retrieve tenant information including the API key
 * for an existing tenant using the tenant ID.
 */

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function makeRequest(hostname, path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function getTenantInfo() {
  console.log('🔍 Payment Processing Platform - Get Tenant Info');
  console.log('================================================\n');

  try {
    // Get application URL
    const appUrl = await question('Enter your Vercel app URL (e.g., payment-processing-sooty.vercel.app): ');
    const hostname = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log('\n📝 Choose how to retrieve tenant information:\n');
    console.log('1. Using Tenant ID');
    console.log('2. Using Login Credentials (will show tenant info)');
    
    const choice = await question('\nEnter your choice (1 or 2): ');

    if (choice === '1') {
      // Get tenant by ID
      const tenantId = await question('Enter your Tenant ID: ');
      
      console.log('\n🔄 Retrieving tenant information...\n');
      
      const response = await makeRequest(hostname, `/api/v1/tenants/${tenantId}`);
      
      if (response.statusCode === 200) {
        const tenant = response.data;
        console.log('✅ Tenant Information Retrieved Successfully!\n');
        
        console.log('🏢 Tenant Details:');
        console.log(`   ID: ${tenant.id}`);
        console.log(`   Name: ${tenant.name}`);
        console.log(`   Subdomain: ${tenant.subdomain}`);
        console.log(`   Plan: ${tenant.plan}`);
        console.log(`   Status: ${tenant.status}`);
        console.log(`   API Key: ${tenant.apiKey}`);
        console.log(`   Trial Ends: ${tenant.trialEndsAt}\n`);
        
        console.log('🌐 How to Access Your Application:');
        console.log('==================================');
        console.log('Method 1 - Using API Key Header:');
        console.log(`   Add header: X-API-Key: ${tenant.apiKey}`);
        console.log(`   Example: curl -H "X-API-Key: ${tenant.apiKey}" https://${hostname}/api/v1/health\n`);
        
        console.log('Method 2 - Using Tenant ID Header:');
        console.log(`   Add header: X-Tenant-ID: ${tenant.id}`);
        console.log(`   Example: curl -H "X-Tenant-ID: ${tenant.id}" https://${hostname}/api/v1/health\n`);
        
      } else {
        console.log('❌ Error retrieving tenant information:');
        console.log(`Status Code: ${response.statusCode}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
    } else if (choice === '2') {
      // Login to get tenant info
      const email = await question('Enter your email: ');
      const password = await question('Enter your password: ');
      
      console.log('\n🔄 Logging in to retrieve tenant information...\n');
      
      const loginData = { email, password };
      const response = await makeRequest(hostname, '/api/v1/auth/public-login', 'POST', loginData);
      
      if (response.statusCode === 200) {
        const { user, tenant, accessToken } = response.data;
        console.log('✅ Login Successful! Tenant Information Retrieved!\n');
        
        console.log('👤 User Information:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role}\n`);
        
        console.log('🏢 Tenant Information:');
        console.log(`   ID: ${tenant.id}`);
        console.log(`   Name: ${tenant.name}`);
        console.log(`   Subdomain: ${tenant.subdomain}`);
        console.log(`   Plan: ${tenant.plan}`);
        console.log(`   Status: ${tenant.status}\n`);
        
        console.log('🔑 Authentication:');
        console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
        
        // Now get the full tenant info with API key using the access token
        console.log('\n🔄 Getting full tenant details with API key...\n');
        
        const tenantResponse = await makeRequest(
          hostname, 
          `/api/v1/tenants/${tenant.id}`, 
          'GET', 
          null, 
          { 'Authorization': `Bearer ${accessToken}` }
        );
        
        if (tenantResponse.statusCode === 200) {
          const fullTenant = tenantResponse.data;
          console.log('📋 Complete Tenant Information:');
          console.log(`   API Key: ${fullTenant.apiKey}\n`);
          
          console.log('🌐 How to Access Your Application:');
          console.log('==================================');
          console.log('Method 1 - Using API Key Header:');
          console.log(`   Add header: X-API-Key: ${fullTenant.apiKey}`);
          console.log(`   Example: curl -H "X-API-Key: ${fullTenant.apiKey}" https://${hostname}/api/v1/health\n`);
          
          console.log('Method 2 - Using Tenant ID Header:');
          console.log(`   Add header: X-Tenant-ID: ${tenant.id}`);
          console.log(`   Example: curl -H "X-Tenant-ID: ${tenant.id}" https://${hostname}/api/v1/health\n`);
          
        } else {
          console.log('⚠️  Could not retrieve API key, but you can use the Tenant ID for access.');
        }
        
      } else {
        console.log('❌ Login failed:');
        console.log(`Status Code: ${response.statusCode}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
    } else {
      console.log('❌ Invalid choice. Please run the script again and choose 1 or 2.');
    }

    console.log('\n🔗 Test These URLs (remember to add the appropriate header):');
    console.log('==========================================================');
    console.log(`Health Check: https://${hostname}/api/v1/health`);
    console.log(`Admin Interface: https://${hostname}/ui/admin`);
    console.log(`Swagger Docs: https://${hostname}/swagger`);
    console.log(`Login: POST https://${hostname}/api/v1/auth/public-login\n`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
getTenantInfo();
