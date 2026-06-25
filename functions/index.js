// استيراد مكتبات Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// إذا لم تكن قد قمت بتهيئة التطبيق في ملف الدوال من قبل
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// هذه الدالة السحابية ستعمل تلقائياً عند إضافة طلب إشعار جديد
exports.sendBroadcastNotification = functions.database.ref('/broadcast_requests/{pushId}')
    .onCreate(async (snapshot, context) => {
        const request = snapshot.val();
        const { title, body } = request;

        console.log(`New broadcast request received: Title - ${title}`);

        // 1. جلب جميع العملاء
        const customersSnapshot = await admin.database().ref('/customers').once('value');
        const customers = customersSnapshot.val();

        if (!customers) {
            console.log("No customers found to send notifications to.");
            return snapshot.ref.remove(); // حذف الطلب بعد الانتهاء
        }

        // 2. تجميع كل رموز الإشعارات (FCM Tokens) الصالحة
        const tokens = [];
        for (const phone in customers) {
            if (customers[phone].fcmToken) {
                tokens.push(customers[phone].fcmToken);
            }
        }

        if (tokens.length === 0) {
            console.log("No valid FCM tokens found.");
            return snapshot.ref.remove();
        }

        console.log(`Found ${tokens.length} tokens. Preparing to send notification.`);

        // 3. تجهيز رسالة الإشعار
        const message = {
            notification: {
                title: title,
                body: body,
            },
            tokens: tokens, // إرسال لنفس الرسالة لجميع الرموز
        };

        try {
            // 4. إرسال الإشعار الجماعي
            const response = await admin.messaging().sendMulticast(message);
            console.log(`${response.successCount} messages were sent successfully`);
            if (response.failureCount > 0) {
                console.log(`${response.failureCount} messages failed to send.`);
                // يمكنك هنا إضافة منطق لمعالجة الرموز التي فشل الإرسال إليها (مثلاً حذفها)
            }
        } catch (error) {
            console.error('Error sending multicast message:', error);
        }

        // 5. حذف طلب الإشعار بعد إتمام العملية
        return snapshot.ref.remove();
    });

// --- دوال إشعارات الأدمن ---

// دالة مساعدة لجلب رموز إشعارات الأدمن وإرسال الإشعار
async function notifyAdmins(payload) {
    const tokensSnapshot = await admin.database().ref('/admin/fcmTokens').once('value');
    const tokensObject = tokensSnapshot.val();
    if (!tokensObject) {
        console.log("No admin tokens found.");
        return;
    }
    const tokens = Object.keys(tokensObject);

    if (tokens.length > 0) {
        console.log(`Sending notification to ${tokens.length} admin devices.`);
        const message = {
            notification: payload,
            tokens: tokens,
        };
        await admin.messaging().sendMulticast(message);
    }
}

// 1. إشعار عند وصول طلب دواء جديد
exports.notifyAdminOnNewOrder = functions.database.ref('/medicine_orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const order = snapshot.val();
        const customersSnapshot = await admin.database().ref(`/customers/${order.phone}`).once('value');
        const customer = customersSnapshot.val();
        const customerName = customer ? customer.name : 'عميل';

        const payload = {
            title: '📥 طلب دواء جديد',
            body: `لديك طلب جديد من العميل: ${customerName}`
        };
        return notifyAdmins(payload);
    });

// 2. إشعار عند وصول طلب من المتجر جديد
exports.notifyAdminOnNewCartOrder = functions.database.ref('/cart_orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const order = snapshot.val();
        const customersSnapshot = await admin.database().ref(`/customers/${order.phone}`).once('value');
        const customer = customersSnapshot.val();
        const customerName = customer ? customer.name : 'عميل';

        const payload = {
            title: '🛒 طلب متجر جديد',
            body: `لديك طلب جديد من المتجر من العميل: ${customerName} بإجمالي ${order.totalPrice} ج.م`
        };
        return notifyAdmins(payload);
    });

// 3. إشعار عند وصول طلب تسجيل حساب جديد
exports.notifyAdminOnNewRegistrationRequest = functions.database.ref('/pending_requests/{phone}')
    .onCreate(async (snapshot, context) => {
        const request = snapshot.val();
        if (request.status !== 'معلق') {
            return null; // لا ترسل إشعاراً إذا لم يكن الطلب معلقاً
        }
        const payload = {
            title: '⏳ طلب تسجيل حساب جديد',
            body: `لديك طلب تسجيل جديد من: ${request.name}`
        };
        return notifyAdmins(payload);
    });

// 4. إشعار عند وصول رسالة محادثة جديدة من عميل
exports.notifyAdminOnNewChatMessage = functions.database.ref('/chats/{phone}/{messageId}')
    .onCreate(async (snapshot, context) => {
        const message = snapshot.val();

        // تأكد من أن المرسل هو العميل
        if (message.sender !== 'customer') {
            return null;
        }

        const phone = context.params.phone;
        const customersSnapshot = await admin.database().ref(`/customers/${phone}`).once('value');
        const customer = customersSnapshot.val();
        const customerName = customer ? customer.name : 'عميل';

        const messageBody = message.type === 'text' ? message.content : (message.type === 'image' ? 'أرسل صورة' : 'أرسل رسالة صوتية');

        const payload = {
            title: `💬 رسالة جديدة من ${customerName}`,
            body: messageBody
        };
        return notifyAdmins(payload);
    });
