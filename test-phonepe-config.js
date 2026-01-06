
require('dotenv').config();



const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const APP_BASE_URL = process.env.APP_BASE_URL;

console.log("1. Environment Variables:");
console.log("   PHONEPE_MERCHANT_ID:", PHONEPE_MERCHANT_ID ? "✓ Set" : "✗ Missing");
console.log("   PHONEPE_SALT_KEY:", PHONEPE_SALT_KEY ? "✓ Set" : "✗ Missing");
console.log("   PHONEPE_SALT_INDEX:", PHONEPE_SALT_INDEX ? "✓ Set" : "✗ Missing");
console.log("   APP_BASE_URL:", APP_BASE_URL ? "✓ Set" : "✗ Missing");

console.log("\n2. Values:");
console.log("   Merchant ID:", PHONEPE_MERCHANT_ID);
console.log("   Salt Key:", PHONEPE_SALT_KEY ? PHONEPE_SALT_KEY.substring(0, 10) + "..." : "Not set");
console.log("   Salt Index:", PHONEPE_SALT_INDEX);
console.log("   Base URL:", APP_BASE_URL);

console.log("\n3. Test Payload Generation:");
const crypto = require('crypto');

const testPayload = {
  merchantId: PHONEPE_MERCHANT_ID,
  merchantTransactionId: "TEST_" + Date.now(),
  merchantUserId: "TEST_USER",
  amount: 100, // 1 rupee in paise
  redirectUrl: `${APP_BASE_URL}Cart?test=true`,
  redirectMode: "REDIRECT",
  callbackUrl: `${APP_BASE_URL}api/v1/phonepe-callback`,
  mobileNumber: "9999999999",
  paymentInstrument: {
    type: "PAY_PAGE"
  }
};

console.log("   Test Payload:", JSON.stringify(testPayload, null, 2));

const base64Payload = Buffer.from(JSON.stringify(testPayload)).toString('base64');
console.log("\n   Base64 Payload:", base64Payload.substring(0, 50) + "...");

const endpoint = "/pg/v1/pay";
const string = base64Payload + endpoint + PHONEPE_SALT_KEY;
const sha256Hash = crypto.createHash('sha256').update(string).digest('hex');
const xVerify = sha256Hash + "###" + PHONEPE_SALT_INDEX;

console.log("\n   X-VERIFY Header:", xVerify.substring(0, 50) + "...");

console.log("\n4. API Endpoint:");
console.log("   URL: https://api.phonepe.com/apis/hermes/pg/v1/pay");

console.log("\n5. Callback URLs:");
console.log("   Redirect URL:", `${APP_BASE_URL}Cart?phonepe_callback=true&orderId=XXX`);
console.log("   Callback URL:", `${APP_BASE_URL}api/v1/phonepe-callback`);



if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY || !PHONEPE_SALT_INDEX || !APP_BASE_URL) {
  console.log("\n  WARNING: Some environment variables are missing!");
  console.log("Please check your .env file.");
  process.exit(1);
} else {
  console.log("\nAll configuration values are present!");
  console.log("\nYou can now test the actual PhonePe API call.");
}
