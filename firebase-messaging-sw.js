// هذا الملف ضروري لعمل الإشعارات في الخلفية
// قم بإنشاء ملف جديد بهذا الاسم وضعه في المجلد الرئيسي لمشروعك

// استيراد مكتبات Firebase اللازمة
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// ! هام جداً: قم بلصق كود الإعدادات الذي نسخته من موقع Firebase هنا
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4hRnaIq3Dn4o8cqgTVk3vg_XXmwyqOlA",
  authDomain: "my-assistant-7c330.firebaseapp.com",
  databaseURL: "https://my-assistant-7c330-default-rtdb.firebaseio.com",
  projectId: "my-assistant-7c330",
  storageBucket: "my-assistant-7c330.firebasestorage.app",
  messagingSenderId: "509561059857",
  appId: "1:509561059857:web:edeb6a4a2526f15bb00fb0",
  measurementId: "G-ZPM602TWDY"
};

// تهيئة تطبيق فايربيز
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// معالجة الإشعارات الواردة عندما يكون التطبيق في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "https://i.imgur.com/rgy8E8S.png", // أيقونة الصيدلية
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
