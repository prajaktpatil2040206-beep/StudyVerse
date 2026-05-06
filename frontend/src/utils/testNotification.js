/**
 * Test Notification Function
 * Use this to test the notification system
 */

import { notificationHelper } from '../services/notificationHelper';

export async function testNotificationSystem(userId, phone = null) {
  console.log('🧪 Testing Notification System...');
  
  // Test 1: Create in-app notification
  console.log('Test 1: Creating in-app notification...');
  const result1 = await notificationHelper.createNotification(
    userId,
    '🎉 Welcome to StudyVerse!',
    'Your notification system is working perfectly!',
    'general',
    '/dashboard'
  );
  console.log('Result:', result1);
  
  // Test 2: Task added notification
  console.log('Test 2: Task added notification...');
  await notificationHelper.notifyTaskAdded(
    userId,
    phone,
    'Complete Math Assignment'
  );
  
  // Test 3: Score update notification
  console.log('Test 3: Score update notification...');
  await notificationHelper.notifyScoreUpdate(
    userId,
    phone,
    'Mathematics',
    85
  );
  
  console.log('✅ All tests completed! Check your notifications.');
}

// To use: Import this in your component and call:
// testNotificationSystem(user.uid, user.phone);
