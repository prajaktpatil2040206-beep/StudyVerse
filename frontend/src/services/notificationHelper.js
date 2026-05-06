/**
 * Notification Helper
 * Centralized functions for creating notifications and sending SMS
 */

const API_BASE = 'http://localhost:8000/api';

export const notificationHelper = {
  /**
   * Create a notification for a user
   */
  async createNotification(userId, title, message, type = 'general', link = null) {
    try {
      const response = await fetch(`${API_BASE}/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title,
          message,
          type,
          link
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error };
    }
  },

  /**
   * Send SMS notification
   */
  async sendSMS(phone, message) {
    try {
      const response = await fetch(`${API_BASE}/notifications/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return { success: false, error };
    }
  },

  /**
   * Task added notification
   */
  async notifyTaskAdded(userId, phone, taskTitle) {
    // Create in-app notification
    await this.createNotification(
      userId,
      '✅ Task Added',
      `New task: "${taskTitle}"`,
      'task',
      '/home'
    );

    // Send SMS if phone provided
    if (phone) {
      await this.sendSMS(
        phone,
        `📝 StudyVerse: New task added - "${taskTitle}". Stay organized!`
      );
    }
  },

  /**
   * Task completed notification
   */
  async notifyTaskCompleted(userId, phone, taskTitle) {
    await this.createNotification(
      userId,
      '🎉 Task Completed',
      `Great job! You completed: "${taskTitle}"`,
      'task',
      '/home'
    );

    if (phone) {
      await this.sendSMS(
        phone,
        `✅ StudyVerse: Task completed - "${taskTitle}". Keep up the momentum!`
      );
    }
  },

  /**
   * Task due soon notification
   */
  async notifyTaskDueSoon(userId, phone, taskTitle, dueTime) {
    await this.createNotification(
      userId,
      '⏰ Task Due Soon',
      `"${taskTitle}" is due at ${dueTime}`,
      'task',
      '/home'
    );

    if (phone) {
      await this.sendSMS(
        phone,
        `⏰ StudyVerse Reminder: "${taskTitle}" is due at ${dueTime}. Complete it now!`
      );
    }
  },

  /**
   * Score update notification
   */
  async notifyScoreUpdate(userId, phone, subject, score) {
    await this.createNotification(
      userId,
      '📊 Score Update',
      `Your ${subject} score: ${score}%`,
      'score',
      '/dashboard'
    );

    if (phone) {
      const emoji = score >= 80 ? '🎯' : score >= 60 ? '📈' : '💪';
      const message = score >= 80 ? 'Excellent!' : score >= 60 ? 'Good progress!' : 'Keep improving!';
      await this.sendSMS(
        phone,
        `${emoji} StudyVerse: Your ${subject} score is ${score}%. ${message}`
      );
    }
  },

  /**
   * Timetable ready notification
   */
  async notifyTimetableReady(userId, phone, email = null, timetableData = null) {
    // Use dedicated endpoint for timetable notifications
    try {
      const response = await fetch(`${API_BASE}/notifications/timetable-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          phone,
          email,
          timetable: timetableData
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to send timetable notification:', error);
      return { success: false, error };
    }
  },

  /**
   * Daily quiz available notification
   */
  async notifyDailyQuizAvailable(userId, phone) {
    await this.createNotification(
      userId,
      '🎯 Daily Quiz Available',
      'Your daily knowledge test is ready. Earn up to 50 XP!',
      'general',
      '/home'
    );

    if (phone) {
      await this.sendSMS(
        phone,
        `🎯 StudyVerse: Daily quiz is ready! Test your knowledge and earn XP.`
      );
    }
  },

  /**
   * Streak milestone notification
   */
  async notifyStreakMilestone(userId, phone, streakDays) {
    await this.createNotification(
      userId,
      '🔥 Streak Milestone!',
      `Amazing! You've maintained a ${streakDays}-day streak!`,
      'general',
      '/gamification'
    );

    if (phone) {
      await this.sendSMS(
        phone,
        `🔥 StudyVerse: Congratulations! ${streakDays}-day streak achieved! Keep it going!`
      );
    }
  }
};
