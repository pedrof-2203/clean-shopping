export const NOTIFICATION_SERVICE = Symbol('');

export interface Notification {
  recipientId: string;
  subject: string;
  message: string;
}

export interface NotificationPort {
  sendNotification(notification: Notification): Promise<void>;
}
