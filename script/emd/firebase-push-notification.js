const firebaseConfig = window.EMD_FIREBASE_CONFIG || {};
const vapidKey = window.EMD_FIREBASE_VAPID_KEY || "";

function emdSendFcmToken(currentToken) {
    const csrfMeta = document.querySelector('meta[name="_token"]');
    const csrfToken = csrfMeta ? csrfMeta.getAttribute("content") : "";

    if (!csrfToken) {
        console.warn("Firebase push disabled: CSRF meta token is missing.");
        return Promise.resolve();
    }

    return fetch("/emd/fcm-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken,
            Accept: "application/json",
        },
        body: JSON.stringify({
            fcm_token: currentToken,
            user_key: userKeyGenerator(),
            lang: document.documentElement.lang || "",
            url: window.location.href,
        }),
    }).then(function (response) {
        if (!response.ok) {
            console.warn(
                "Firebase push token was not saved.",
                response.status,
                response.statusText
            );
        }
    });
}

if (!firebaseConfig.apiKey || !vapidKey) {
    console.warn(
        "Firebase push disabled: EMD_FIREBASE_* env values are not set for this site."
    );
} else if (!("Notification" in window)) {
    console.warn("Firebase push disabled: notifications are not supported.");
} else if (!("serviceWorker" in navigator)) {
    console.warn("Firebase push disabled: service workers are not supported.");
} else {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    const swUrl =
        "/firebase-messaging-sw.js?" +
        new URLSearchParams(firebaseConfig).toString();
    Notification.requestPermission()
        .then(function (permission) {
            if (permission !== "granted") {
                console.log("Notification permission was not granted.");
                return null;
            }

            return navigator.serviceWorker.register(swUrl);
        })
        .then(function (registration) {
            if (!registration) {
                return null;
            }

            messaging
                .getToken({
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: registration,
                })
                .then(function (currentToken) {
                    if (currentToken) {
                        return emdSendFcmToken(currentToken);
                    } else {
                        console.log("No registration token available.");
                    }
                })
                .catch(function (err) {
                    console.log(
                        "An error occurred while retrieving token. ",
                        err
                    );
                });
        })
        .catch(function (err) {
            console.log("Firebase push setup failed:", err);
        });
}
