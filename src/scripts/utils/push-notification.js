// src/scripts/utils/push-notification.js
import { VAPID_PUBLIC_KEY, BASE_URL, ACCESS_TOKEN_KEY } from './config';

// Helper function untuk konversi VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const VAPID_UINT8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

export const getSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

const sendSubscriptionToServer = async (subscription, action) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error('Unauthorized: No login token found.');

  const endpoint = action === 'subscribe' ? 'push-subscribe' : 'push-unsubscribe';
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || `Failed to ${action} subscription to server`);
    console.log(`Subscription ${action} sent to server successfully!`);
  } catch (err) {
    console.error(`Error sending ${action} subscription:`, err);
    throw err;
  }
};

export const subscribePush = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notification not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_UINT8,
    });
  }

  await sendSubscriptionToServer(subscription.toJSON(), 'subscribe');
  return subscription;
};

export const unsubscribePush = async () => {
  const subscription = await getSubscription();
  if (!subscription) return true;

  // Unsubscribe dari server
  await sendSubscriptionToServer(subscription.toJSON(), 'unsubscribe');

  // Unsubscribe dari browser
  const success = await subscription.unsubscribe();
  if (!success) throw new Error('Browser unsubscribe failed.');

  console.log('Unsubscribe success.');
  return success;
};