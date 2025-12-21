const axios = require('axios');

const API_KEY = '1L5B-SY7E-7J6S-DOAN';
const BASE_URL = 'http://casa-backend.local/wp-json/frm/v2';

// Test data for each form
const testData = {
  CASE_INTAKE: {
    form_id: 25,
    item_meta: {
      "24": "Test Child",
      "25": "Test Last", 
      "26": "2024-01-01",
      "29": "TEST-2024-003",
      "30": "Dependency"
    }
  },
  USER_REGISTRATION: {
    form_id: 26,
    item_meta: {
      "46": "Test",
      "47": "User",
      "48": "test@example.com",
      "49": "password123",
      "50": "password123",
      "51": "555-1234"
    }
  },
  VOLUNTEER_REGISTRATION: {
    form_id: 28,
    item_meta: {
      "69": "Test",
      "70": "Volunteer",
      "71": "volunteer@example.com",
      "72": "555-5678",
      "73": "1990-01-01",
      "74": "123 Main St",
      "75": "Test City",
      "76": "Test State",
      "77": "12345",
      "78": "Emergency Contact",
      "79": "555-9999",
      "80": "Spouse",
      "87": "2",
      "89": "Reference 1",
      "90": "555-1111",
      "91": "Friend",
      "92": "Reference 2",
      "93": "555-2222",
      "94": "Colleague",
      "99": true,
      "100": true,
      "101": true
    }
  },
  CONTACT_LOG: {
    form_id: 32,
    item_meta: {
      "135": "TEST-2024-001",
      "137": "2024-01-01",
      "136": "phone",
      "138": "Test Contact",
      "139": "Parent",
      "142": "Test contact notes"
    }
  }
};

async function testForm(formName, data) {
  try {
    console.log(`Testing ${formName}...`);
    const response = await axios.post(`${BASE_URL}/entries`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${API_KEY}:x`).toString('base64')}`
      }
    });
    
    console.log(`✅ ${formName} - SUCCESS`);
    console.log(`   Entry ID: ${response.data.id}`);
    console.log(`   Entry Key: ${response.data.item_key}`);
    return true;
  } catch (error) {
    console.log(`❌ ${formName} - FAILED`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('Testing Formidable Forms Integration...\n');
  
  const results = [];
  
  for (const [formName, data] of Object.entries(testData)) {
    const success = await testForm(formName, data);
    results.push({ formName, success });
    console.log(''); // Add spacing
  }
  
  console.log('=== SUMMARY ===');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.formName}`);
  });
}

runTests().catch(console.error);
