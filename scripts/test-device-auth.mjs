import 'dotenv/config';

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:4321';
const API_URL = `${BASE_URL}/api/auth`;

async function testDeviceAuth() {
  console.log('🚀 Starting Device Authorization Flow...');

  // 1. Request Device Code
  console.log('\n📡 Requesting device code...');
  const codeReq = await fetch(`${API_URL}/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: 'cli-test',
    }),
  });

  const rawText = await codeReq.text();
  let codeRes;
  try {
    codeRes = JSON.parse(rawText);
  } catch (err) {
    console.error(`❌ Failed to parse response as JSON. Status: ${codeReq.status}. Body:`, rawText);
    process.exit(1);
  }

  if (!codeReq.ok) {
    console.error(`❌ Failed to get device code (Status ${codeReq.status}):`, codeRes);
    process.exit(1);
  }

  const { device_code, user_code, verification_uri_complete, interval = 5, expires_in } = codeRes;

  console.log('✅ Device code retrieved successfully!');
  console.log('\n==================================================');
  console.log(`🔗 Please visit: ${verification_uri_complete}`);
  console.log(`🔑 Or go to the verification page and enter code: ${user_code}`);
  console.log(`⏱️  This code expires in ${expires_in} seconds.`);
  console.log('==================================================\n');

  console.log(`⏳ Polling for authorization (every ${interval} seconds)...`);

  // 2. Poll for the token
  const pollInterval = interval * 1000;
  
  const poll = async () => {
    const tokenReq = await fetch(`${API_URL}/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'cli-test',
        device_code: device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const tokenRes = await tokenReq.json();

    if (tokenReq.ok) {
      console.log('\n🎉 Authorization successful!');
      console.log('🔑 Access Token:', tokenRes.access_token || tokenRes.token);
      console.log('👤 Session info:', tokenRes);
      process.exit(0);
    }

    if (tokenRes.error === 'authorization_pending') {
      process.stdout.write('.');
      setTimeout(poll, pollInterval);
    } else if (tokenRes.error === 'slow_down') {
      console.log('\n⚠️ Slow down, increasing polling interval...');
      setTimeout(poll, pollInterval + 5000);
    } else {
      console.error('\n❌ Authorization failed:', tokenRes.error, tokenRes.error_description || tokenRes.message);
      process.exit(1);
    }
  };

  setTimeout(poll, pollInterval);
}

testDeviceAuth().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
