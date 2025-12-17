// OneSignal Configuration Debug Script
// Run this to verify your OneSignal setup

require('dotenv').config();
const OneSignal = require('@onesignal/node-onesignal');

console.log('=== OneSignal Configuration Debug ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID);
console.log('   ONESIGNAL_REST_API_KEY exists:', !!process.env.ONESIGNAL_REST_API_KEY);
console.log('   ONESIGNAL_REST_API_KEY length:', process.env.ONESIGNAL_REST_API_KEY?.length || 0);

// Validate format
console.log('\n2. Format Validation:');
const appId = process.env.ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_REST_API_KEY;

if (appId) {
  const appIdFormat = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  console.log('   App ID format valid:', appIdFormat.test(appId));
} else {
  console.log('   ❌ App ID is missing!');
}

if (apiKey) {
  // OneSignal REST API keys are typically longer strings
  console.log('   API Key format seems valid:', apiKey.length > 30);
} else {
  console.log('   ❌ REST API Key is missing!');
}

// Test OneSignal client creation
console.log('\n3. OneSignal Client Test:');
try {
  const app_key_provider = {
    getToken() {
      return process.env.ONESIGNAL_REST_API_KEY;
    }
  };
  
  const configuration = OneSignal.createConfiguration({
    authMethods: {
      app_key: {
        tokenProvider: app_key_provider
      }
    }
  });
  
  const client = new OneSignal.DefaultApi(configuration);
  console.log('   ✅ OneSignal client created successfully');
  
  // Test notification creation (without sending)
  const testNotification = new OneSignal.Notification();
  testNotification.app_id = appId;
  testNotification.include_player_ids = ['test-player-id'];
  testNotification.contents = { en: 'Test message' };
  testNotification.headings = { en: 'Test Title' };
  
  console.log('   ✅ Test notification object created successfully');
  console.log('   Sample notification:', {
    app_id: testNotification.app_id,
    include_player_ids: testNotification.include_player_ids,
    contents: testNotification.contents,
    headings: testNotification.headings
  });
  
} catch (error) {
  console.log('   ❌ Error creating OneSignal client:', error.message);
}

console.log('\n=== Debug Complete ===');
console.log('\nTo fix 403 errors:');
console.log('1. Go to OneSignal Dashboard > Settings > Keys & IDs');
console.log('2. Copy the App ID (UUID format)');
console.log('3. Copy the REST API Key (long string)');
console.log('4. Update your .env file with correct values');
console.log('5. Restart your server');

// Instructions for testing
console.log('\n=== Next Steps ===');
console.log('1. Verify your OneSignal app settings');
console.log('2. Check if your OneSignal app supports the platform (Android/iOS)');
console.log('3. Ensure the player ID is valid and exists in your OneSignal app');
console.log('4. Test with a simple notification first');

module.exports = {
  testConfiguration: () => {
    return {
      appId: !!process.env.ONESIGNAL_APP_ID,
      apiKey: !!process.env.ONESIGNAL_REST_API_KEY,
      appIdFormat: process.env.ONESIGNAL_APP_ID ? /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(process.env.ONESIGNAL_APP_ID) : false
    };
  }
};
