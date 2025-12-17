// Test file for OneSignal notification system
// This file can be used to test the notification functionality

const notification = require('../src/app/services/notification');

// Test function to send a notification to a specific user
async function testUserNotification(userId) {
  try {
    console.log('Testing notification for user:', userId);
    
    const result = await notification.notify(
      userId,
      'Test Notification', 
      'This is a test notification from the backend',
      null // no tracking link
    );
    
    console.log('Notification result:', result);
    return result;
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
}

// Test function to send broadcast notification to all users
async function testBroadcastNotification() {
  try {
    console.log('Testing broadcast notification...');
    
    const result = await notification.notifyAllUsers(
      'This is a broadcast test notification',
      'Broadcast Test'
    );
    
    console.log('Broadcast result:', result);
    return result;
  } catch (error) {
    console.error('Broadcast test failed:', error);
    throw error;
  }
}

module.exports = {
  testUserNotification,
  testBroadcastNotification
};

// Usage examples:
// const testNotifications = require('./test-notifications');
// testNotifications.testUserNotification('USER_ID_HERE');
// testNotifications.testBroadcastNotification();
