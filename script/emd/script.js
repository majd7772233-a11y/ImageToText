
const emdReadUserKeyCookie = () => {
    const cookie = document.cookie.match(/(?:^|; )user_key=([^;]*)/);
    return cookie ? decodeURIComponent(cookie[1]) : "";
};

const userKeyGenerator = () => {
    let user_key = localStorage.getItem("user-key");
    if (!user_key) {
        user_key =
            localStorage.getItem("e-track-key") ||
            emdReadUserKeyCookie() ||
            Date.now() + Math.random().toString(36).substring(2, 22);
        localStorage.setItem("user-key", user_key);
    }
    return user_key;
};
userKeyGenerator();

/* @deprecated — kept so site-specific frontend scripts that still call
 * getETrackKey() keep working after merging. Use userKeyGenerator(). */
const getETrackKey = () => userKeyGenerator();


const emdGenerateReqKey = () => {
    return Date.now() + Math.random().toString(36).substring(2, 22);
};

/*
 * Mirror the user_key into a plain cookie so server-side access logs can store
 * it per request — EmdAccessLogHeaderMiddleware reads the cookie and stamps the
 * user_key response header. localStorage stays the source of truth.
 */
const emdSyncUserKeyCookie = () => {
    const user_key = userKeyGenerator();
    if (emdReadUserKeyCookie() === user_key) {
        return user_key;
    }
    document.cookie =
        "user_key=" +
        encodeURIComponent(user_key) +
        "; path=/; max-age=" +
        60 * 60 * 24 * 365 +
        "; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");

    return user_key;
};
emdSyncUserKeyCookie();
