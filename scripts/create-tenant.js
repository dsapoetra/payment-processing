#!/usr/bin/env node

/**
 * Create Tenant Script
 * 
 * This script helps you create your first tenant and admin user
 * for the Payment Processing Platform deployed on Vercel.
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

function makeRequest(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

    req.write(postData);
    req.end();
  });
}

async function createTenant() {
  console.log('🚀 Payment Processing Platform - Tenant Creation');
  console.log('==================================================\n');

  try {
    // Get application URL
    const appUrl = await question('Enter your Vercel app URL (e.g., payment-processing-sooty.vercel.app): ');
    const hostname = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log('\n📝 Please provide the following information:\n');

    // Get user information
    const email = await question('Admin Email: ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const password = await question('Password (min 8 chars, uppercase, lowercase, number, special char): ');
    const phoneNumber = await question('Phone Number (optional, e.g., +1-555-123-4567): ');

    console.log('\n🏢 Organization Information:\n');

    const organizationName = await question('Organization Name: ');
    const organizationType = await question('Organization Type (business/nonprofit/government) [business]: ') || 'business';
    const industry = await question('Industry (technology/finance/retail/healthcare/other) [technology]: ') || 'technology';
    const website = await question('Website (optional): ');
    const description = await question('Description (optional): ');

    console.log('\n🔄 Creating tenant and admin user...\n');

    const requestData = {
      email,
      firstName,
      lastName,
      password,
      organizationName,
      organizationType,
      industry
    };

    // Add optional fields if provided
    if (phoneNumber) requestData.phoneNumber = phoneNumber;
    if (website) requestData.website = website;
    if (description) requestData.description = description;

    const response = await makeRequest(hostname, '/api/v1/auth/public-register', requestData);

    if (response.statusCode === 201) {
      console.log('✅ Success! Tenant and admin user created successfully!\n');
      
      const { user, tenant, accessToken } = response.data;
      
      console.log('👤 Admin User Created:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
      
      console.log('🏢 Organization (Tenant) Created:');
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Plan: ${tenant.plan}`);
      console.log(`   API Key: ${tenant.apiKey}\n`);
      
      console.log('🔑 Authentication:');
      console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
      console.log(`   Expires In: ${response.data.expiresIn} seconds\n`);
      
      console.log('📋 Important Information to Save:');
      console.log('================================');
      console.log(`API Key: ${tenant.apiKey}`);
      console.log(`Tenant ID: ${tenant.id}`);
      console.log(`Subdomain: ${tenant.subdomain}\n`);
      
      console.log('🌐 How to Access Your Application:');
      console.log('==================================');
      console.log('Method 1 - Using API Key Header:');
      console.log(`   Add header: X-API-Key: ${tenant.apiKey}`);
      console.log(`   Example: curl -H "X-API-Key: ${tenant.apiKey}" https://${hostname}/api/v1/health\n`);
      
      console.log('Method 2 - Using Tenant ID Header:');
      console.log(`   Add header: X-Tenant-ID: ${tenant.id}`);
      console.log(`   Example: curl -H "X-Tenant-ID: ${tenant.id}" https://${hostname}/api/v1/health\n`);
      
      console.log('🔗 Test These URLs:');
      console.log('===================');
      console.log(`Health Check: https://${hostname}/api/v1/health`);
      console.log(`Admin Interface: https://${hostname}/ui/admin`);
      console.log(`Swagger Docs: https://${hostname}/swagger`);
      console.log(`Login: POST https://${hostname}/api/v1/auth/public-login\n`);
      
      console.log('🎉 Setup Complete! Your Payment Processing Platform is ready to use.');
      
    } else {
      console.log('❌ Error creating tenant:');
      console.log(`Status Code: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.message) {
        console.log(`\nError: ${response.data.message}`);
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
createTenant();
