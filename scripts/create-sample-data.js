#!/usr/bin/env node

/**
 * Create Sample Data Script
 * 
 * This script creates sample merchants and transactions to populate the dashboard
 * with meaningful data for demonstration purposes.
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000/api/v1';
const TENANT_ID = '7034f42a-907c-4920-8ca6-c45635856564';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZDc5ZGY0Ny1jNjRlLTQ3NmMtOTM0YS1jN2IwMTBlODlkZmEiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6InRlbmFudF9hZG1pbiIsInRlbmFudElkIjoiNzAzNGY0MmEtOTA3Yy00OTIwLThjYTYtYzQ1NjM1ODU2NTY0IiwiaWF0IjoxNzU1MjY5NjE0LCJleHAiOjE3NTUzNTYwMTR9.KWwK41cUQNAtmiDxvRV0cY-H6aL8RY4jtgeLwcBBz3Q';

function makeRequest(url, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
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

async function createSampleMerchants() {
  console.log('Creating sample merchants...');
  
  const merchants = [
    {
      businessName: 'TechCorp Solutions',
      legalName: 'TechCorp Solutions LLC',
      email: 'admin@techcorp.com',
      phoneNumber: '+1-555-0101',
      type: 'business',
      website: 'https://techcorp.com',
      description: 'Leading technology solutions provider',
      industry: 'TECH',
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US'
      }
    },
    {
      businessName: 'Fashion Forward',
      legalName: 'Fashion Forward Inc',
      email: 'orders@fashionforward.com',
      phoneNumber: '+1-555-0102',
      type: 'business',
      website: 'https://fashionforward.com',
      description: 'Premium fashion retailer',
      industry: 'RETAIL',
      address: {
        street: '456 Fashion Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      }
    },
    {
      businessName: 'HealthPlus Clinic',
      legalName: 'HealthPlus Medical Services LLC',
      email: 'billing@healthplus.com',
      phoneNumber: '+1-555-0103',
      type: 'business',
      website: 'https://healthplus.com',
      description: 'Modern healthcare services',
      industry: 'HEALTH',
      address: {
        street: '789 Medical Center Dr',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'US'
      }
    },
    {
      businessName: 'EduLearn Platform',
      legalName: 'EduLearn Technologies Corp',
      email: 'support@edulearn.com',
      phoneNumber: '+1-555-0104',
      type: 'corporation',
      website: 'https://edulearn.com',
      description: 'Online learning platform',
      industry: 'EDU',
      address: {
        street: '321 Education Blvd',
        city: 'Austin',
        state: 'TX',
        postalCode: '73301',
        country: 'US'
      }
    },
    {
      businessName: 'FoodieDelight',
      legalName: 'FoodieDelight Restaurant Group LLC',
      email: 'orders@foodiedelight.com',
      phoneNumber: '+1-555-0105',
      type: 'business',
      website: 'https://foodiedelight.com',
      description: 'Gourmet food delivery service',
      industry: 'FOOD',
      address: {
        street: '654 Culinary Way',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US'
      }
    }
  ];

  const createdMerchants = [];
  
  for (const merchant of merchants) {
    try {
      const response = await makeRequest(`${API_BASE}/merchants`, merchant);
      if (response.statusCode === 201) {
        console.log(`✅ Created merchant: ${merchant.businessName}`);
        createdMerchants.push(response.data);
        
        // Activate the merchant
        const activateResponse = await makeRequest(
          `${API_BASE}/merchants/${response.data.id}/activate`, 
          {}, 
          'POST'
        );
        if (activateResponse.statusCode === 200) {
          console.log(`✅ Activated merchant: ${merchant.businessName}`);
        }
      } else {
        console.log(`❌ Failed to create merchant ${merchant.businessName}:`, response.data);
      }
    } catch (error) {
      console.log(`❌ Error creating merchant ${merchant.businessName}:`, error.message);
    }
  }
  
  return createdMerchants;
}

async function createSampleTransactions(merchants) {
  console.log('Creating sample transactions...');
  
  const paymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'];
  const currencies = ['USD', 'EUR', 'GBP'];
  const transactionCount = 50;
  
  for (let i = 0; i < transactionCount; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const amount = Math.floor(Math.random() * 1000) + 10; // $10 - $1010
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    
    const transaction = {
      merchantId: merchant.id,
      amount: amount,
      currency: currency,
      paymentMethod: paymentMethod,
      description: `Sample transaction ${i + 1}`,
      customerEmail: `customer${i + 1}@example.com`,
      customerPhone: `+1-555-${String(i + 1).padStart(4, '0')}`,
      orderId: `ORDER-${Date.now()}-${i}`,
      customerDetails: {
        firstName: `Customer${i + 1}`,
        lastName: 'Test',
        address: {
          street: `${i + 1} Test Street`,
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        }
      },
      paymentDetails: {
        cardLast4: '1234',
        cardBrand: 'visa',
        expiryMonth: '12',
        expiryYear: '2025'
      }
    };
    
    try {
      const response = await makeRequest(`${API_BASE}/transactions`, transaction);
      if (response.statusCode === 201) {
        console.log(`✅ Created transaction ${i + 1}/${transactionCount}: $${amount} ${currency}`);
      } else {
        console.log(`❌ Failed to create transaction ${i + 1}:`, response.data);
      }
    } catch (error) {
      console.log(`❌ Error creating transaction ${i + 1}:`, error.message);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function main() {
  console.log('🚀 Creating sample data for Payment Processing Platform');
  console.log('====================================================\n');
  
  try {
    // Create merchants first
    const merchants = await createSampleMerchants();
    
    if (merchants.length === 0) {
      console.log('❌ No merchants created. Cannot create transactions.');
      return;
    }
    
    console.log(`\n✅ Created ${merchants.length} merchants successfully!\n`);
    
    // Create transactions
    await createSampleTransactions(merchants);
    
    console.log('\n🎉 Sample data creation completed!');
    console.log('You can now refresh your dashboard to see the updated metrics.');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the script
main();
