// Test Auth API
const API_URL = 'http://localhost:5000/api';

async function testAuth() {
  const testUser = `testuser_${Date.now()}`;
  const testEmail = `${testUser}@test.com`;
  const testPassword = 'Test123456';
  
  console.log('\n========================================');
  console.log('    ADVANCED SKETCH AUTH API TESTS');
  console.log('========================================\n');
  
  let token = null;
  
  // TEST 1: Register
  console.log('🔵 TEST 1: Register New User');
  console.log(`   Username: ${testUser}`);
  console.log(`   Email: ${testEmail}`);
  
  try {
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser,
        email: testEmail,
        password: testPassword
      })
    });
    
    const registerData = await registerRes.json();
    
    if (registerRes.ok && registerData.success) {
      console.log('   ✅ SUCCESS: User registered');
      console.log(`   User ID: ${registerData.data.user.id}`);
      token = registerData.data.token;
      console.log(`   Token: ${token.substring(0, 30)}...`);
    } else {
      console.log(`   ❌ FAILED: ${registerData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 2: Register duplicate email
  console.log('\n🔵 TEST 2: Register Duplicate Email (should fail)');
  
  try {
    const dupRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'different_user',
        email: testEmail,
        password: testPassword
      })
    });
    
    const dupData = await dupRes.json();
    
    if (!dupRes.ok) {
      console.log(`   ✅ EXPECTED: ${dupData.message}`);
    } else {
      console.log('   ❌ UNEXPECTED: Should have failed');
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 3: Login with email
  console.log('\n🔵 TEST 3: Login with Email');
  
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhoneOrUsername: testEmail,
        password: testPassword
      })
    });
    
    const loginData = await loginRes.json();
    
    if (loginRes.ok && loginData.success) {
      console.log('   ✅ SUCCESS: Logged in with email');
      console.log(`   User: ${loginData.data.user.username}`);
      token = loginData.data.token;
    } else {
      console.log(`   ❌ FAILED: ${loginData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 4: Login with username
  console.log('\n🔵 TEST 4: Login with Username');
  
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhoneOrUsername: testUser,
        password: testPassword
      })
    });
    
    const loginData = await loginRes.json();
    
    if (loginRes.ok && loginData.success) {
      console.log('   ✅ SUCCESS: Logged in with username');
    } else {
      console.log(`   ❌ FAILED: ${loginData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 5: Login with wrong password
  console.log('\n🔵 TEST 5: Login with Wrong Password (should fail)');
  
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhoneOrUsername: testEmail,
        password: 'wrongpassword'
      })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginRes.ok) {
      console.log(`   ✅ EXPECTED: ${loginData.message}`);
    } else {
      console.log('   ❌ UNEXPECTED: Should have failed');
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 6: Get current user (/me)
  console.log('\n🔵 TEST 6: Get Current User (/me)');
  
  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const meData = await meRes.json();
    
    if (meRes.ok && meData.success) {
      console.log('   ✅ SUCCESS: Got user data');
      console.log(`   Username: ${meData.data.user.username}`);
      console.log(`   Email: ${meData.data.user.email}`);
    } else {
      console.log(`   ❌ FAILED: ${meData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 7: Get /me without token (should fail)
  console.log('\n🔵 TEST 7: Get /me Without Token (should fail)');
  
  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const meData = await meRes.json();
    
    if (!meRes.ok) {
      console.log(`   ✅ EXPECTED: Unauthorized`);
    } else {
      console.log('   ❌ UNEXPECTED: Should have failed');
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 8: Update profile
  console.log('\n🔵 TEST 8: Update Profile');
  
  try {
    const updateRes = await fetch(`${API_URL}/auth/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        username: `${testUser}_updated`
      })
    });
    
    const updateData = await updateRes.json();
    
    if (updateRes.ok && updateData.success) {
      console.log('   ✅ SUCCESS: Profile updated');
      console.log(`   New username: ${updateData.data.user.username}`);
    } else {
      console.log(`   ❌ FAILED: ${updateData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 9: Change password
  console.log('\n🔵 TEST 9: Change Password');
  
  const newPassword = 'NewTest123456';
  try {
    const pwRes = await fetch(`${API_URL}/auth/password`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: testPassword,
        newPassword: newPassword
      })
    });
    
    const pwData = await pwRes.json();
    
    if (pwRes.ok && pwData.success) {
      console.log('   ✅ SUCCESS: Password changed');
    } else {
      console.log(`   ❌ FAILED: ${pwData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 10: Login with new password
  console.log('\n🔵 TEST 10: Login with New Password');
  
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhoneOrUsername: testEmail,
        password: newPassword
      })
    });
    
    const loginData = await loginRes.json();
    
    if (loginRes.ok && loginData.success) {
      console.log('   ✅ SUCCESS: Logged in with new password');
    } else {
      console.log(`   ❌ FAILED: ${loginData.message}`);
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  // TEST 11: Login with old password (should fail)
  console.log('\n🔵 TEST 11: Login with Old Password (should fail)');
  
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhoneOrUsername: testEmail,
        password: testPassword
      })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginRes.ok) {
      console.log(`   ✅ EXPECTED: ${loginData.message}`);
    } else {
      console.log('   ❌ UNEXPECTED: Should have failed');
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}`);
  }
  
  console.log('\n========================================');
  console.log('           TESTS COMPLETED');
  console.log('========================================\n');
}

testAuth().catch(console.error);
