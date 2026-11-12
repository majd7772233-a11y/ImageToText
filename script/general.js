var detectadsbocker = true;
let currentMode = null;
let ratingValue;
const LANG_TOGGLES = ".js-toggle-source-lang, .js-toggle-dest-lang, #bulkDestLang";
const POPUPS = [
    { sel: ".search-modal.active", close: () => $(".js-close-search").first().trigger("click") },
    { sel: ".lightbox-overlay, .lightbox-container", close: () => $(".lightbox-overlay, .lightbox-container").remove() },
    { sel: ".hist_text_container:not(.d-none)", close: () => $(".hist_text_container").addClass("d-none") },
    {
        sel: ".lang-modal:not(.d-none)",
        opener: LANG_TOGGLES,
        close: () => {
            $(".lang-modal").addClass("d-none");
            $(".search-lang").val("").trigger("input");
            $(LANG_TOGGLES).removeClass("active_lang");
        },
    },
    { sel: ".settings-modal:not(.d-none)", close: () => $(".js-close-settings").first().trigger("click") },
    {
        sel: ".modal:visible",
        close: () => {
            $(".modal").hide();
        },
    },
    { sel: ".modal-overlay:not(.d-none)", close: () => $(".modal-overlay").addClass("d-none") },
    { sel: "#history-data.modal-opened", opener: "#view-history", close: () => $("#history-data").removeClass("modal-opened") },
];
// Set once the feedback endpoint answers 429 — later submits are answered here, not sent.
let feedbackThrottleMessage = "";

const validImageTypesByTool = {
    default: ["image/gif", "image/jpeg", "image/jpg", "image/png"],
    "image-to-text": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/jpe",
        "image/jfif",
        "image/jfi",
        "image/jif",
        "image/tiff",
        "image/webp",
        "application/pdf",
        "image/heif",
        "image/heic",
    ],
    "jpg-to-word": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/jpe",
        "image/jfif",
        "image/jfi",
        "image/jif",
        "image/tiff",
        "image/webp",
        "image/heif",
        "image/heic",
    ],
    "image-translator": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/jpe",
        "image/jfif",
        "image/jfi",
        "image/jif",
        "image/tiff",
        "image/webp",
    ],
    "image-to-pdf": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/jpe",
        "image/jfif",
        "image/jfi",
        "image/jif",
        "image/tiff",
        "image/webp",
        "image/heif",
        "image/heic",
    ],
    "pdf-to-text": ["application/pdf"],
    "pdf-to-word": ["application/pdf"],
    "pdf-to-jpg": ["application/pdf"],
    "word-to-pdf": [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    "word-to-excel": [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    "csv-to-excel": [
        "text/csv",
        "application/csv",
        "text/comma-separated-values"
    ],
    "excel-to-csv": [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
    ],
    "ppt-to-pdf": [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    "merge-pdf": ["application/pdf"],
    "html-to-pdf": ["text/html"],
    "jpg-to-excel": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heif",
        "image/heic",
        "image/tiff",
        "image/gif",
    ],
    "word-to-jpg": [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    "excel-to-jpg": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.spreadsheet-template",
    ],
    "excel-to-pdf": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.spreadsheet-template",
    ],
    "excel-to-pdf": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.spreadsheet-template",
    ],
    "pdf-to-excel": [
        "application/pdf",
    ],
    "pdf-to-csv": ["application/pdf"],
    "barcode-scanner": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/jpe",
        "image/jfif",
        "image/jfi",
        "image/jif",
        "image/tiff",
        "image/webp",
        "image/heif",
        "image/heic",
        "application/pdf",
    ],
};
const mimeToExtensions = {
    "image/gif": [".gif"],
    "image/jpeg": [".jpeg", ".jpg"],
    "image/jpg": [".jpg"],
    "image/png": [".png"],
    "image/bmp": [".bmp"],
    "image/jpe": [".jpe"],
    "image/jfif": [".jfif"],
    "image/jfi": [".jfi"],
    "image/jif": [".jif"],
    "image/tiff": [".tiff"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "image/heif": [".heif"],
    "image/heic": [".heic"],
    "application/msword": [".doc", ".docx"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
    ],
    "text/html": [".html", ".htm"],
    "text/csv": [".csv"],
    "application/csv": [".csv"],
    "text/comma-separated-values": [".csv"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
    ],
    "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
    "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
    "application/vnd.oasis.opendocument.spreadsheet-template": [".ots"],
};
const $stars = $(".stars button");

const showValidationPopup = (heading, message, button = "") => {
    if ($(".modal:visible").length) return;
    $("#invalidImageModal").remove();
    const tryAnother = button ? `<span class="accountModalClose try-another-btn">${button}</span>` : "";
    $("body").append(`
        <div id="invalidImageModal" class="modal" style="display: block">
            <div class="modal-content invalidImageModal">
                <div class="limit-modal-body">
                    <div class="a-i-center">
                        <img src="${BASE_URL}web_assets/frontend/img/icons/caution.png" alt="caution">
                        <p class="heading text-center">${heading}</p>
                    </div>
                    <p class="modal-text">${message}</p>
                    <div class="button_row">
                        <span class="browse-btn keep-plan-btn accountModalClose close_invalid_file">${popupCloseBtn}</span>
                        ${tryAnother}
                    </div>
                </div>
            </div>
        </div>
    `);
};

const showLimitModal = (heading, description) => {
    if ($(".modal:visible").length) return;
    $("#limitExceedModal").show();
    $(".js-modal-heading").text(heading);
    $(".js-popup-err-desc").text(description);
    $(".loader-container-new").addClass("d-none");
};

const fitFilesToMode = (files, cards, notify = true) => {
    let usedPages = 0;
    let hiddenForSize = false;
    let hiddenForCount = false;

    files.forEach((file, index) => {
        const pages = file.totalPages || 1;
        const tooBig = file.size / (1024 * 1024) > currentMode.file_size;
        const tooMany = usedPages + pages > currentMode.per_submission;

        file.stashed = tooBig || tooMany;
        $(cards).eq(index).toggleClass("d-none", file.stashed);

        if (tooBig) {
            hiddenForSize = true;
        } else if (tooMany) {
            hiddenForCount = true;
        } else {
            usedPages += pages;
        }
    });

    const activeCount = files.filter((file) => !file.stashed).length;
    const showPopup = notify || activeCount === 0;
    if (showPopup && hiddenForSize) {
        showLimitModal(imageSizeForPremium, currentMode.size_message);
    } else if (showPopup && hiddenForCount) {
        showLimitModal(limitExced, currentMode.files_message);
    }
    return activeCount;
};

const selectToolMode = (id) => {
    currentMode = TOOL_MODES.find((mode) => mode.id == id);

    $(".js-tool-mode").removeClass("active");
    const $selected = $(`.js-tool-mode[data-mode="${id}"]`);
    $selected.addClass("active");
    $selected.find("input").prop("checked", true);

    if (typeof fitFiles === "function") {
        fitFiles();
    }
};

$(document).ready(() => {
    if (typeof TOOL_MODES === "undefined") {
        return;
    }
    selectToolMode(TOOL_MODES[0].id);

    $(".js-tool-mode").on("click", function (e) {
        e.preventDefault();
        const mode = TOOL_MODES.find((item) => item.id == $(this).data("mode"));
        if (mode.locked) {
            showLimitModal(premiumModeTitle, premiumModeDesc);
            return;
        }
        if (mode !== currentMode) {
            selectToolMode(mode.id);
        }
    });
});

// Captcha-free upsell popup — <x-captcha-free-popup />; onContinue runs when the visitor picks Continue, so the tool resumes the request
let captchaFreeOnContinue = null;
const showCaptchaFreeModal = (count = null, onContinue = null) => {
    const desc = $(".js-captcha-free-desc");
    if (count !== null && desc.data("template")) {
        desc.html(String(desc.data("template")).replace("{count}", count));
    }
    captchaFreeOnContinue = onContinue;
    $(".modal").hide();
    $("#captchaFreeModal").show();
};
const hideCaptchaFreeModal = () => {
    $("#captchaFreeModal").hide();
};
$(document).on("click", ".js-captcha-free-close", hideCaptchaFreeModal);
$(document).on("click", ".js-captcha-free-continue", () => {
    hideCaptchaFreeModal();
    if (typeof captchaFreeOnContinue === "function") captchaFreeOnContinue();
});

function setRouteCookie(cookieName, value, days = 1) {
    let expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}`;
}
function getCookie(cookieName) {
    let matches = document.cookie.match(
        new RegExp(
            "(?:^|; )" +
            cookieName.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
            "=([^;]*)"
        )
    );
    return matches ? decodeURIComponent(matches[1]) : false;
}
function removeCookie(cookieName) {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

let premiumLoginFlag = 0;
function clearPaymentSession() {
    $.ajax({
        type: "POST",
        url: BASE_URL + "clear-payment-session",
        headers: {
            "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
        },
        success: function (response) { },
    });
}

function validateEmail(email) {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

const currentRoute = window.location.pathname.replace(/\//g, "_");
const cookieName = `isFeedBackSubmitted${currentRoute}`;

// Get the current route dynamically
const currentRouteCheck = window.location.pathname.replace(/\//g, "_");
const cookieCheckName = `isFeedBackSubmitted${currentRouteCheck}`;

const isFeedBackSubmitted = getCookie(cookieCheckName) || false;

const lazyLoadImages = () => {
    const $lazyImages = $(".lazy-image");
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const $img = $(entry.target);
                    const src = $img.data("src");
                    if (src) {
                        $img.attr("src", src)
                            .removeClass("lazy-image")
                            .removeAttr("data-src");
                    }
                    observer.unobserve(entry.target);
                }
            });
        });
        $lazyImages.each(function () {
            observer.observe(this);
        });
    } else {
        $lazyImages.each(function () {
            const $img = $(this);
            const src = $img.data("src");
            if (src) {
                $img.attr("src", src)
                    .removeClass("lazy-image")
                    .removeAttr("data-src");
            }
        });
    }
};

$(document).ready(function () {
    lazyLoadImages();

    $(document).on("click", ".resend_email_login", function (e) {
        let url_to_send = $(this).data("url");
        $.ajax({
            url: url_to_send,
            type: "POST",
            data: {
                email: $('input[name="email_page"]').val(),
                _token: $('meta[name="_token"]').attr("content"),
            },
            success: function (response) {
                if (response.status) {
                    $("#message_status").html(
                        `<p class="success" style="color: green">${response.mess}</p>`
                    );
                    $(".div_verifi").removeClass("d-flex").addClass("d-none");
                } else {
                    $("#message_status").html(
                        `<p class="error" style="color: red">${response.mess}</p>`
                    );
                }
            },
            error: function (xhr) {
                $("#message_status").html(
                    '<p class="error" style="color: red">An error occurred. Please try again.</p>'
                );
            },
        });
    });

    // rating starts logic start
    $stars.hover(
        function () {
            const rating = $(this).data("count");
            highlightStars(rating);
        },
        function () {
            const $clickedStar = $(".stars button.clicked");
            const clickedRating = $clickedStar.length
                ? $clickedStar.last().data("count")
                : 0;
            highlightStars(clickedRating);
        }
    );

    $("#get_now_js").on("click", function () {
        record_user_action(
            "New Year Sale Banner",
            "New Year Sale Banner Cliked",
            2,
            TOOL_ID
        );
    });
    // focus url input on click its parent div
    $("#get_now_js").on("click", function () {
        record_user_action(
            "New Year Sale Banner",
            "New Year Sale Banner Cliked",
            2,
            TOOL_ID
        );
    });
    $(".url-input-div").on("click", function () {
        $(this).find(".file-url").focus();
    });
    // onclick star open review form popup
    $stars.on("click", function (e) {
        e.stopPropagation();
        const $reviewForm = $(".review-form");
        if ($(this).hasClass("clicked")) {
            $reviewForm.stop(true, true).slideUp();
            resetReviewStars();
            return;
        }

        const wasOpen = $stars.filter(".clicked").length > 0;
        ratingValue = $(this).data("count");
        highlightStars(ratingValue);

        if (!wasOpen) {
            $reviewForm.find("#email").val("");
            $reviewForm.find("#message").val("");
            $reviewForm.stop(true, true).slideDown();
        }
        $stars.removeClass("clicked");
        $(this).addClass("clicked");
    });
    // hide form on outside click of doc
    $(document).on("click", (e) => {
        const $reviewForm = $(".review-form");
        const $starsButton = $(".stars button");
        const $starsIcon = $(".stars button img");

        // Check if the clicked element is NOT inside the review form or the stars button
        if (
            !$reviewForm.is(e.target) &&
            $reviewForm.has(e.target).length === 0 &&
            !$starsButton.is(e.target) &&
            $starsButton.has(e.target).length === 0 &&
            !$starsIcon.is(e.target) &&
            $starsIcon.has(e.target).length === 0
        ) {
            $reviewForm.slideUp();
            resetReviewStars();
        }
    });
    // onsubmit review form
    $(".review-form").on("submit", handleReviewForm);
    // rating stars logic end

    $(".js-toggle-pro").on("click", toggleProMode);
    $(".online-chat-li").on("click", openChat);
    $(".online-chat-nav").on("click", openChat);

    $.ajaxSetup({
        data: {
            emd_is_tool_premium: IS_TOOL_PREMIUM,
        },
    });
    setTimeout(() => {
        $(".error-alert").remove();
    }, 3000);
    $(".js-plan-option").on("change", (e) => {
        const _this = $(e.currentTarget);
        const id = _this.data("id");
        const code = _this.data("code");
        const coupon = _this.data("coupon");
        const checkoutLink = generateCheckoutLink(code, id, coupon ?? "");
        const user_auth_id = $(".js-subscription-btn").data("auth-id");
        $(".js-subscription-btn").attr(
            "href",
            checkoutLink + "&x-uid=" + user_auth_id
        );
        $(".js-guest-subscription-btn").attr("data-id", id);
        $(".js-guest-subscription-btn").attr("data-code", code);
    });
    $(document).on("click", ".subscription-price", (e) => {
        const features = $(e.currentTarget).data("features");
        if (!features) {
            return;
        }
        $.each(features, (feature, value) => {
            $(`[data-feature="${feature}"] .js-feature-value`).text(value);
        });
    });

    $(document).on("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        if ($(e.target).is("input, textarea, select") || !$("#limitExceedModal").is(":visible")) return;
        const $options = $("#limitExceedModal .js-plan-option");
        if (!$options.length) return;
        e.preventDefault();
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
        const i = $options.index($options.filter(":checked"));
        $options.eq((i + step + $options.length) % $options.length)
            .prop("checked", true)
            .trigger("focus")
            .trigger("change");
    });

    $(".accountModal").on("click", (e) => {
        $(".modal").hide();
        $("#loginRegisterModal").show();
        let plan_id = $(e.currentTarget).data("id");
        let plan_code = $(e.currentTarget).data("code");
        let coupon_code = $(e.currentTarget).data("coupon") ?? "";
        premiumLoginFlag = 1;
        $(".plan-id").val(plan_id);
        $(".plan-code").val(plan_code);
        $(".coupon-code").val(coupon_code);
        $.ajax({
            type: "POST",
            url: BASE_URL + "set-payment-session",
            data: {
                plan_id,
                plan_code,
                coupon_code,
            },
            headers: {
                "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
            },
            success: function (response) { },
        });
    });

    $(".cancel-modal").on("click", (e) => {
        $("#cancelSubscriptionModal").show();
    });

    $(document).on("click", ".accountModalClose", () => {
        // Hide all modals in one call
        $(".modal").hide();

        // Clear session and reset flag
        premiumLoginFlag = 0;
        clearPaymentSession();

        // Reset message and forms
        $("#message_status").empty();
        $("#login-form")[0].reset();
        $("#signup-form")[0].reset();
    });

    // window.onclick = function (event) {
    //     var modal = document.getElementById("loginRegisterModal");
    //     if (event.target == modal) {
    //         modal.style.display = "none";
    //     }
    // }

    $("#jsShowSignIn").on("click", (e) => {
        $(".showSignIn").removeClass("d-none");
        $(".showSignUp").addClass("d-none");
        $("#message_status").html("");
    });

    $("#jsShowSignUp").on("click", (e) => {
        $(".showSignIn").addClass("d-none");
        $(".showSignUp").removeClass("d-none");
        $("#message_status").html("");
    });

    $(".dropdown").on("click", (e) => {
        $(".dropdown-content").toggleClass("active");
    });

    window.addEventListener("click", (e) => {
        if (document.getElementById("dropdown")) {
            if (
                !document.getElementById("dropdown").contains(e.target) &&
                window.innerWidth > 991
            ) {
                $(".dropdown-content").removeClass("active");
            }
        }
    });
});
function generateCheckoutLink(planCode = 91113, planID = 35, coupon = null) {
    // Create the query parameters object
    const queryParams = {
        "products[1][id]": planCode,
        "page-template": 16845,
        language: "en",
        // 'currency': 'USD',
        // 'payment-method': 14,
        "x-pid": planID,
    };

    // Add the coupon if provided
    if (coupon !== null && coupon !== "") {
        queryParams["coupon-code-to-add"] = coupon;
    }

    // Convert the query parameters object into a query string
    const queryString = new URLSearchParams(queryParams).toString();

    // Construct the full URL
    const baseLink = "https://store.payproglobal.com/checkout";
    return decodeURIComponent(`${baseLink}?${queryString}`);
}

// Example usage:
// console.log(generateCheckoutLink(12345, 67890, 'MYCOUPON2024'));

const getAllowedExtensions = (mimeTypes) => {
    const allowedExtensions = new Set();
    mimeTypes.forEach((mimeType) => {
        if (mimeToExtensions[mimeType]) {
            mimeToExtensions[mimeType].forEach((extension) =>
                allowedExtensions.add(extension)
            );
        }
    });
    return Array.from(allowedExtensions);
};
const getValidImageTypes = (tool = "default") => {
    return validImageTypesByTool[tool] || validImageTypesByTool.default;
};
const loadScriptsDynamically = (scripts) => {
    scripts.forEach((scriptInfo) => {
        const script = document.createElement("script");
        script.src = scriptInfo.src;
        script.async = true;
        script.defer = true;
        if (scriptInfo.id) {
            script.id = scriptInfo.id;
        }
        if (scriptInfo.type) {
            script.type = scriptInfo.type;
        }
        if (scriptInfo.attributes) {
            Object.keys(scriptInfo.attributes).forEach((attr) => {
                script.setAttribute(attr, scriptInfo.attributes[attr]);
            });
        }
        document.head.appendChild(script);
    });
};
const toggleProMode = () => {
    if (IS_PREMIUM) {
        $.ajaxSetup({
            headers: {
                "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
            },
        });
        $.ajax({
            type: "POST",
            url: BASE_URL + "toggle-pro-mode",
            success: function (response) {
                window.location.href = BASE_URL;
            },
        });
        return;
    }
};
const toggle_menubar = (e) => {
    const $dropdown = $(".mobile-nav-dropdown");
    const $closeIconTrigger = $(".navbar-icon");
    const $menuIconTrigger = $(".close-icon");
    const $viewmoeTrigger = $(".go-icon");

    $("body").css("overflow", $dropdown.hasClass("w-100") ? "auto" : "hidden");
    $dropdown.toggleClass("w-100");
    $closeIconTrigger.toggleClass("d-none");
    $menuIconTrigger.toggleClass("d-none");
    setTimeout(() => {
        $viewmoeTrigger.toggleClass("d-none");
    }, 200);
};

const startOver = (e) => {
    $(".result-span").hide();
    $(".tool-span").show();
    $(".before-upload").removeClass("d-none");
    $(".after-upload").addClass("d-none");
    if (!getValidImageTypes().includes("application/pdf")) {
        $("#img-prev").attr("src", "");
    }
    $(".file-url").val("");
    $("#file").val("");
    $(".after-loader").removeClass("d-none");
    $(".loader").addClass("d-none");
    $("#edit-tool-btns").css("display", "none");
    $("#uploads-btns").css("display", "block");
    $(".left").show();
    $(".span-start-over").hide();
    $(".js_capcha_submit_row").show();
    image = null;
    captchaToken = "";
};
const base64CheckImageExists = (base64Data, callback) => {
    var img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
        callback(true);
    };
    img.onerror = function () {
        callback(false);
    };
    img.src = base64Data;
};

const checkIfImageExists = (url, callback) => {
    const img = new Image();
    img.src = url;
    if (img.complete) {
        callback(true);
    } else {
        img.onload = () => {
            callback(true);
        };
        img.onerror = () => {
            callback(false);
        };
    }
};
const imageUrlToFileList = async (imageUrl) => {
    const fileList = new DataTransfer();
    let response;
    try {
        response = await fetch(imageUrl, { mode: "cors" }); // Ensure CORS mode
        if (
            !response.ok ||
            response.headers.get("content-type").includes("text/html")
        ) {
            throw new Error("Image request returned HTML instead of an image.");
        }
    } catch (e) {
        // Send request to backend (server-side workaround)
        const formData = new FormData();
        const csrfToken = $('meta[name="_token"]').attr("content");
        formData.append("imageUrl", imageUrl);
        formData.append("_token", csrfToken);
        response = await fetch(BASE_URL + "fetch-file", {
            method: "POST",
            body: formData,
        });
    }
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
        return null; // Exit early if it's not an image
    }
    const file = new File([blob], "image." + blob.type.split("/").pop(), {
        type: blob.type,
    });
    fileList.items.add(file);
    return [...fileList.files];
};

const checkIfFileExistsAndIsValid = (url, type, callback) => {
    if (type === "image") {
        const img = new Image();
        img.src = url;
        if (img.complete) {
            callback(true);
        } else {
            img.onload = () => callback(true);
            img.onerror = () => callback(false);
        }
    } else if (type === "pdf") {
        callback(true);
    } else {
        callback(false);
    }
};
const isValidURL = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === "data:" &&
            url.includes(";base64,")) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

const containsURL = (text) => {
    const pattern = /\b(https?:\/\/|ftp:\/\/|www\.)\S+/i;
    return pattern.test(text);
};

const urlToFileList = async (fileUrl, type) => {
    const fileList = new DataTransfer();
    let response;

    try {
        response = await fetch(fileUrl, { mode: "cors" });

        if (
            !response.ok ||
            (type === "image" &&
                response.headers.get("content-type").includes("text/html")) ||
            (type === "pdf" &&
                response.headers.get("content-type") !== "application/pdf")
        ) {
            throw new Error("Invalid content type");
        }
    } catch (e) {
        // Fallback to backend proxy
        const formData = new FormData();
        const csrfToken = $('meta[name="_token"]').attr("content");
        formData.append("fileUrl", fileUrl);
        formData.append("fileType", type);
        formData.append("_token", csrfToken);
        response = await fetch(BASE_URL + "fetch-file", {
            method: "POST",
            body: formData,
        });
    }

    const blob = await response.blob();
    if (
        (type === "image" && !blob.type.startsWith("image/")) ||
        (type === "pdf" && blob.type !== "application/pdf")
    ) {
        return null;
    }

    const extension = blob.type.split("/").pop();
    const file = new File([blob], `file.${extension}`, { type: blob.type });
    fileList.items.add(file);
    return [...fileList.files];
};

const getFileTypeFromUrl = (url) => {
    const extension = url.split(".").pop().split("?")[0].toLowerCase();
    if (
        ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension)
    ) {
        return "image";
    } else if (extension === "pdf") {
        return "pdf";
    } else {
        return "unknown";
    }
};

const detectMimeType = async (url) => {
    try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) throw new Error("Bad response");

        const contentType = res.headers.get("Content-Type");

        if (contentType?.startsWith("image/")) return "image";
        if (contentType === "application/pdf") return "pdf";
        return "unknown";
    } catch (err) {
        return "unknown";
    }
};

const getAccurateFileType = async (url) => {
    let type = getFileTypeFromUrl(url);
    if (type === "unknown") {
        type = await detectMimeType(url);
    }
    return type;
};
const convertTiffToJpgBase64 = (tiffFile) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const buffer = e.target.result;
                const tiff = new Tiff({ buffer: buffer });
                const canvas = tiff.toCanvas(0);
                const jpegCanvas = document.createElement("canvas");
                const ctx = jpegCanvas.getContext("2d");
                jpegCanvas.width = canvas.width;
                jpegCanvas.height = canvas.height;
                ctx.drawImage(canvas, 0, 0);
                const jpegBase64 = jpegCanvas.toDataURL("image/jpeg");
                resolve(jpegBase64);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = function (error) {
            reject(error);
        };
        reader.readAsArrayBuffer(tiffFile);
    });
};

const convertWebpFileToJpgBase64 = (webpFile) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                const jpgBase64 = canvas.toDataURL("image/jpeg");
                resolve(jpgBase64);
            };
            img.onerror = function (error) {
                reject(error);
            };
            img.src = e.target.result;
        };
        reader.onerror = function (error) {
            reject(error);
        };
        reader.readAsDataURL(webpFile);
    });
};

const fetchAndConvertToBase64 = async (dropboxLink) => {
    try {
        // Fetch the image content from the Dropbox link
        const response = await fetch(dropboxLink);
        // Check if the response is successful (status code 200)
        if (response.ok) {
            // Read the response body as an ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();
            // Convert the ArrayBuffer to a base64-encoded string
            const base64String = arrayBufferToBase64(arrayBuffer);
            return base64String;
        } else {
            // Handle HTTP error
            throw new Error(
                `HTTP Error: ${response.status} - ${response.statusText}`
            );
        }
    } catch (error) {
        // Handle network or other errors
        throw error;
    }
};
const createDocxWithImage = (base64Image, imageWidth) => {
    const content = "";
    // Calculate the maximum width based on the page width (in twips)
    const maxWidthTwips = 12240; // Assuming standard A4 paper size (8.5 x 11 inches) with default margins

    // Convert imageWidth from inches to twips
    const maxWidthPixels = maxWidthTwips / 1440; // Convert from twips to pixels

    // Calculate the image width in twips
    const imageWidthTwips = imageWidth * 1440; // Convert from inches to twips

    // Adjust the image width if it exceeds the maximum width
    const adjustedWidthTwips = Math.min(imageWidthTwips, maxWidthTwips);

    // Construct the XML for the document
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                <w:p>
                    <w:r>
                        <w:t>${content}</w:t>
                    </w:r>
                </w:p>
                <w:p>
                    <w:r>
                        <w:drawing>
                            <wp:inline distT="0" distB="0" distL="0" distR="0">
                                <wp:extent cx="${adjustedWidthTwips}" cy="auto"/>
                                <wp:docPr id="1" name="image"/>
                                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                            <pic:nvPicPr>
                                                <pic:cNvPr id="0" name="Image 1"/>
                                                <pic:cNvPicPr/>
                                            </pic:nvPicPr>
                                            <pic:blipFill>
                                                <a:blip r:embed="wordml://${base64Image}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                                                <a:stretch>
                                                    <a:fillRect/>
                                                </a:stretch>
                                            </pic:blipFill>
                                            <pic:spPr>
                                                <a:xfrm>
                                                    <a:off x="0" y="0"/>
                                                    <a:ext cx="${adjustedWidthTwips}" cy="auto"/>
                                                </a:xfrm>
                                            </pic:spPr>
                                        </pic:pic>
                                    </a:graphicData>
                                </a:graphic>
                            </wp:inline>
                        </w:drawing>
                    </w:r>
                </w:p>
            </w:body>
        </w:document>`;

    // Convert the document XML to a Blob
    const blob = new Blob([doc], { type: "application/msword" });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.doc"; // Change the file extension to .doc

    // Append the link to the document body and trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up by revoking the URL
    URL.revokeObjectURL(url);
};

// Function to convert an ArrayBuffer to base64
const arrayBufferToBase64 = (arrayBuffer) => {
    const binary = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
    return btoa(binary);
};
// code to show chat on click btn
const openChat = () => {
    return;
    if (window.fcWidget.isOpen()) {
        window.fcWidget.close();
    } else {
        window.fcWidget.open();
    }
};
// code to show div on click on premium modes for free user

const promiseReadFile = (formdata) => {
    return new Promise((resolve, reject) => {
        $.ajaxSetup({
            headers: {
                "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
            },
        });

        $.ajax({
            url: BASE_URL + "read-file",
            type: "POST",
            data: formdata,
            contentType: false,
            processData: false,
            success: function (response) {
                try {
                    // let result = stripHtml(response) || response;
                    resolve(response); // Resolve the Promise with the result
                } catch (error) {
                    reject(error); // Reject the Promise if an error occurs
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                reject(textStatus); // Reject the Promise with the error message
            },
        });
    });
};

// Function to read text from various file types and return as a Promise
const getTextFromFile = (file) => {
    // Ensure we return a Promise that resolves with the extracted text
    return new Promise((resolve, reject) => {
        if (file.type === "text/plain" || file.type === "") {
            // Plain text file
            readTextFile(file).then(resolve).catch(reject);
        } else if (file.type === "application/pdf") {
            // PDF file
            readPdfFile(file).then(resolve).catch(reject);
        } else if (
            file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            // DOCX file (using Mammoth)
            readDocumentFile(file).then(resolve).catch(reject);
        } else if (file.type === "application/msword") {
            const formData = new FormData();
            formData.append("file", file);
            promiseReadFile(formData).then(resolve).catch(reject);
        } else if (file.type === "text/html") {
            const formData = new FormData();
            formData.append("file", file);
            promiseReadHtmlText(formData).then(resolve).catch(reject);
        } else {
            // Unsupported file type
            reject(new Error("Unsupported file type"));
        }
    });
};
function promiseReadHtmlText(formData) {
    return new Promise((resolve, reject) => {
        try {
            const file = formData.get("file");
            if (!file) {
                return reject("No file found in FormData");
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const htmlText = event.target.result;
                resolve(htmlText);
            };
            reader.onerror = (error) => {
                reject("Error reading HTML file: " + error);
            };
            reader.readAsText(file);
        } catch (err) {
            reject("Unexpected error: " + err);
        }
    });
}

// Function to read text from a plain text file
const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function (event) {
            const textContent = event.target.result;
            resolve(textContent);
        };
        reader.onerror = function () {
            reject(new Error("Error reading text file"));
        };
        reader.readAsText(file);
    });
};

// Function to read text from a PDF file
const readPdfFile = (file) => {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function (event) {
            var typedarray = new Uint8Array(event.target.result);
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            // Handle password-protected PDFs
            loadingTask.onPassword = function (callback, reason) {
                let msg = "This PDF is password protected. Enter password:";
                if (reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
                    msg = "Incorrect password. Try again:";
                }
                const password = prompt(msg);
                if (password !== null) {
                    callback(password);
                } else {
                    reject({
                        ok: false,
                        count: count,
                        error: "Password required",
                    });
                }
            };

            const handlePdfError = function (err) {
                const message = (err && err.message ? err.message : String(err)).toLowerCase();
                if (
                    (err && err.name === "InvalidPDFException") ||
                    message.includes("invalid pdf") ||
                    message.includes("missing pdf") ||
                    message.includes("unexpected server response")
                ) {
                    reject(new Error("INVALID_FILE"));
                } else {
                    reject(err);
                }
            };

            loadingTask.promise
                .then(async (pdf) => {
                    const pagesPromises = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        pagesPromises.push(
                            pdf.getPage(i).then((page) => {
                                return page
                                    .getTextContent()
                                    .then((textContent) => {
                                        if (0 == textContent.items.length)
                                            return "";
                                        // Sort text items by y-position, then by x-position for better layout preservation
                                        const sortedItems =
                                            textContent.items.sort((a, b) => {
                                                if (
                                                    a.transform[5] ===
                                                    b.transform[5]
                                                ) {
                                                    return (
                                                        a.transform[4] -
                                                        b.transform[4]
                                                    );
                                                }
                                                return (
                                                    b.transform[5] -
                                                    a.transform[5]
                                                );
                                            });

                                        // Rebuild lines of text based on y-coordinate proximity
                                        let lines = [];
                                        let currentLine = [];
                                        let currentY =
                                            sortedItems[0].transform[5];

                                        sortedItems.forEach((item) => {
                                            const itemY = item.transform[5];
                                            const itemX = item.transform[4];

                                            // New line if the y-position changes significantly
                                            if (
                                                Math.abs(itemY - currentY) > 5
                                            ) {
                                                lines.push(
                                                    currentLine.join(" ")
                                                );
                                                currentLine = [];
                                                currentY = itemY;
                                            }
                                            currentLine.push(item.str);
                                        });

                                        // Add the last line
                                        if (currentLine.length)
                                            lines.push(currentLine.join(" "));

                                        return lines.join("\n");
                                    });
                            })
                        );
                    }
                    // Join all pages' texts with a page separator
                    Promise.all(pagesPromises)
                        .then((pagesText) => {
                            resolve(pagesText.join("\n\n"));
                        })
                        .catch(handlePdfError);
                })
                .catch(handlePdfError);
        };
        reader.onerror = function () {
            reject(new Error("Error reading PDF file"));
        };
        reader.readAsArrayBuffer(file);
    });
};

const getPageText = (pageNum, PDFDocumentInstance) => {
    return PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
        return pdfPage.getTextContent().then(function (textContent) {
            var textItems = textContent.items;
            var finalString = "";
            for (var i = 0; i < textItems.length; i++) {
                var item = textItems[i];
                finalString += item.str + " ";
            }

            return finalString;
        });
    });
};
// Function to extract text from a DOCX file using Mammoth
const readDocumentFile = (file) => {
    // https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function (event) {
            var arrayBuffer = event.target.result;
            var handleError = function (err) {
                var message = (err && err.message ? err.message : String(err)).toLowerCase();
                if (
                    message.includes("could not find word/document.xml") ||
                    message.includes("central directory") ||
                    message.includes("is this a zip file")
                ) {
                    reject(new Error("INVALID_FILE"));
                } else {
                    reject(new Error("Error extracting text from DOCX file: " + err));
                }
            };
            try {
                mammoth
                    .convertToHtml({ arrayBuffer: arrayBuffer })
                    .then(function (result) {
                        var text = result.value;
                        text = text.replace(/<a id="[^"]*"><\/a>/g, "");
                        resolve(text);
                    })
                    .catch(handleError);
            } catch (err) {
                handleError(err);
            }
        };
        reader.onerror = function () {
            reject(new Error("Error reading DOCX file"));
        };
        reader.readAsArrayBuffer(file);
    });
};

const generateRandomString = (length = 6) => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }

    return result;
};
const scriptPromises = {};

const loadScript_global = async (src, id, globalExportName = null) => {
    if (document.getElementById(id)) {
        return globalExportName ? window[globalExportName] : undefined;
    }
    if (scriptPromises[id]) {
        return scriptPromises[id];
    }
    scriptPromises[id] = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.id = id;
        script.onload = () => {
            resolve(globalExportName ? window[globalExportName] : undefined);
        };
        script.onerror = (err) => {
            console.error("Error loading script:", src);
            reject(err);
        };
        document.head.appendChild(script);
    });

    return scriptPromises[id];
};

const loadScript = (src, id) => {
    const existing = document.getElementById(id);
    if (!scriptPromises[id] || !existing) {
        scriptPromises[id] = existing
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = src;
                script.id = id;
                script.onload = resolve;
                script.onerror = (err) => {
                    script.remove();
                    delete scriptPromises[id];
                    reject(err);
                };
                document.head.appendChild(script);
            });
    }
    return scriptPromises[id];
};
const loadStyle = (src, id) => {
    return new Promise((resolve, reject) => {
        if ($("#" + id).length) {
            resolve();
            return;
        }
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = src;
        link.id = id;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
};

const shortenTheFileName = (fileName, maxLength = 10) => {
    if (!fileName) return "";
    const dot = fileName.lastIndexOf(".");
    if (dot <= 0) {
        return fileName.length <= maxLength ? fileName : fileName.slice(0, maxLength) + "...";
    }
    const baseName = fileName.slice(0, dot);
    if (baseName.length <= maxLength) return fileName;
    return baseName.slice(0, maxLength) + "..." + fileName.slice(dot + 1);
};

const sniffRealImageMime = async (blob) => {
    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const matches = (bytes, offset = 0) =>
        bytes.every((byte, i) => head[offset + i] === byte);

    if (matches([0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
    if (matches([0x47, 0x49, 0x46, 0x38])) return 'image/gif';
    if (matches([0x42, 0x4d])) return 'image/bmp';
    if (matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';

    return null;
};

const convertHeicToImg = async (file) => {
    if (!file) return null;

    const isHeic = file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        /\.heic$/i.test(file.name) ||
        /\.heif$/i.test(file.name);

    if (!isHeic) {
        return await blobToBase64(file);
    }

    if (typeof HeicTo === "undefined") {
        await loadScript("https://cdn.jsdelivr.net/npm/heic-to@1.4.3/dist/iife/heic-to.js", "heic-to");
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
        const convertedBlob = await HeicTo({
            blob: file,
            format: 'JPEG',
            quality: 0.92
        });
        return await blobToBase64(convertedBlob);
    } catch (err) {
        console.warn("HEIC decode failed, checking for a mislabeled image", err);
        const realMime = await sniffRealImageMime(file);
        if (realMime) {
            return await blobToBase64(new Blob([file], { type: realMime }));
        }
        return await blobToBase64(file);
    }

};

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
    });
};

// fill the stars up to the given rating (0 clears them)
function highlightStars(rating = 0) {
    $stars.each(function () {
        const starRating = $(this).data("count");
        const $img = $(this).find("img");
        if (rating >= 1 && starRating <= rating) {
            $img.addClass("hover");
        } else {
            $img.removeClass("hover");
        }
    });
}
// clear the stars and the rating they stand for together, so both stay in sync
function resetReviewStars() {
    ratingValue = 0;
    $stars.removeClass("clicked");
    highlightStars(0);
    setTimeout(() => {
        $("#js-error-message").removeClass("review-error review-success").text("");
    }, 300);
}
const record_user_action = (title, detail, type = 1, tool_id = 1) => {
    if (ACTION_RECORD_ENABLED == 0) {
        return;
    }

    let formData = new FormData();
    formData.append("title", title);
    formData.append("detail", detail);
    formData.append("type", type);
    formData.append("tool_id", tool_id);
    formData.append("e_track_key", getETrackKey());
    formData.append("user_type", IS_PREMIUM);
    formData.append("is_tool_premium", IS_TOOL_PREMIUM);

    $.ajax({
        type: "POST",
        url: BASE_URL + "emd/action-record",
        data: formData,
        processData: false,
        contentType: false,
        headers: {
            "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
        },
    });
};
// handle review form
const handleReviewForm = async (e) => {
    e.preventDefault();
    $("#js-error-message").removeClass("review-error review-success").text("");
    if (feedbackThrottleMessage) {
        $("#js-error-message")
            .addClass("review-error")
            .fadeIn()
            .text(feedbackThrottleMessage);
        setTimeout(() => {
            $("#js-error-message").removeClass("review-error").text("");
        }, 3000);
        return;
    }
    const $formData = new FormData();
    let email = $(".review-form #email").val();
    let message = ($(".review-form #message").val() || "").trim();
    if (ratingValue <= 4 && message == "") {
        $("#js-error-message")
            .addClass("review-error")
            .fadeIn()
            .text("Please enter a message");
        return;
    }
    if (message == "") {
        message = "---";
    }
    if (message.length < 3) {
        message += " ---";
    }
    const $reviewForm = $(".review-form");

    $formData.append("rating", ratingValue);
    $formData.append("email", email);
    $formData.append("message", message);
    $formData.append("tool_id", TOOL_ID);
    $formData.append("e_track_key", getETrackKey());

    try {
        $.ajax({
            method: "POST",
            url: BASE_URL + "emd/feedback-send",
            contentType: false,
            processData: false,
            data: $formData,
            headers: {
                "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
            },
            success: function (response) {
                $("#js-error-message")
                    .addClass("review-success")
                    .fadeIn()
                    .text("Feedback Submitted");
                $(".submit-message").css("pointer-events", "none");
                setRouteCookie(cookieName, true, 1);
                setTimeout(() => {
                    $(".review-form #email").val("");
                    $(".review-form #message").val("");
                    resetReviewStars();
                    $reviewForm.slideUp();
                    $("#js-error-message")
                        .removeClass("review-success")
                        .text("");
                    $(".review-stars").addClass("d-none");
                    $(".submit-message").css("pointer-events", "auto");
                }, 3000);
            },
            error: function (xhr) {
                if (xhr.status === 429) {
                    feedbackThrottleMessage =
                        xhr.responseJSON?.message || "Too Many Attempts.";
                }
                $("#js-error-message")
                    .addClass("review-error")
                    .fadeIn()
                    .text(xhr.responseJSON?.message || "An error occurred.");
                setTimeout(() => {
                    $("#js-error-message").removeClass("review-error").text("");
                }, 3000);
            },
            complete: function () {
                setTimeout(() => {
                    $(".submit-message").css("pointer-events", "auto");
                }, 3000);
            },
        });
    } catch (error) {
        console.log("error", error);
    }
};
const base64ToFile = (base64, fileName) => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const byteString = atob(arr[1]);
    const buffer = new ArrayBuffer(byteString.length);
    const view = new DataView(buffer);

    for (let i = 0; i < byteString.length; i++) {
        view.setUint8(i, byteString.charCodeAt(i));
    }

    const blob = new Blob([buffer], { type: mime });

    return new File([blob], fileName, { type: mime });
};

$(document).on("keydown", (e) => {
    if (e.key !== "Escape" && e.keyCode !== 27) return;
    const popup = POPUPS.find((item) => $(item.sel).length);
    if (popup) popup.close();
});

$(document).on("click", (e) => {
    const popup = POPUPS.find((item) => $(item.sel).length);
    if (!popup || !document.contains(e.target)) return;

    const $clicked = $(e.target);
    if (popup.opener) {
        if (!$clicked.closest(popup.sel).length && !$clicked.closest(popup.opener).length) popup.close();
    } else if ($clicked.is(popup.sel)) {
        popup.close();
    }
});

$(document).on("click", ".eye_icon", function () {
    const $input = $(this).siblings("input");
    const isHidden = $input.attr("type") === "password";
    const icon = isHidden ? "eye_open" : "eye_closed";

    $input.attr("type", isHidden ? "text" : "password");
    $(this).attr("src", `${BASE_URL}web_assets/frontend/img/icons/${icon}.svg`);
});

const NO_HISTORY_SCREEN = `
<div class="no-access">
    <div class="access-text">
        <div class="head">No History found!</div>
        <div class="desc">Sorry, there are no files here.</div>
    </div>
</div>`;

$('#view-history').on('click', () => {
    record_user_action("history button clicked.", "history button clicked.", 2, TOOL_ID);
    $('#history-data').addClass('modal-opened');
    $(".hist-pan-body").removeClass("d-none");
    $("#back-to-history, .hist-detail-body").addClass("d-none");
    $(".hist-pan-head .heading, .history-date-container").removeClass("d-none");
    $(".file_count_by_key, .tool_name").addClass("d-none");
    if (IS_TOOL_PREMIUM && IS_PREMIUM == 1) {
        $('.hist-pan-body').html('<div class="imagetotext-progress" style="position: absolute; bottom: 48%; left: 50%; transform: translateX(-50%);"></div>');
        if (typeof window.fetchHistory === 'function') {
            window.fetchHistory();
        } else {
            window.historyLoadPending = true;
        }
    }
});

$(document).on('click', '#openSearchBar, .js-open-search-mobile', (e) => {
    e.preventDefault();
    if (typeof window.openToolSearch === 'function') {
        window.openToolSearch();
    } else {
        window.toolSearchPending = true;
        loadScript(BASE_URL + 'web_assets/frontend/script/tool-search-bar.js' + FILE_VERSION, 'toolSearchBar');
    }
});

$(document).on('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && typeof window.openToolSearch !== 'function') {
        e.preventDefault();
        $('#openSearchBar').trigger('click');
    }
});

$(document).on('click', '#close-pan', () => {
    $("#history-data").removeClass("modal-opened");
});

$(document).on('click', '#back-to-history', function () {
    $(".hist-pan-body").removeClass("d-none");
    $("#back-to-history, .hist-detail-body").addClass("d-none");
    $(".hist-pan-head .heading, .history-date-container").removeClass("d-none");
});

$(document).on('click', '.close_text_preview', function (e) {
    e.stopPropagation();
    $(".hist_text_container").addClass("d-none");
});

const scrollPage = (selector, offset = 0) => {
    const el = selector ? document.querySelector(selector) : null;
    const top = el ? el.getBoundingClientRect().top + window.pageYOffset - offset : 0;
    window.scrollTo({ top, behavior: "smooth" });
};

let toolDropzoneReady = false;
const toolDropzones = new Set();

// "Drop File Here" replaces the siblings it sits next to, so the class belongs
// on whichever element is that label's parent
const dropzoneTarget = (zone) => {
    const $zone = $(zone);
    if ($zone.children(".drop-file-text").length) return $zone;
    const $section = $zone.find(".drop-file-text").parent().first();
    return $section.length ? $section : $zone;
};

const initToolDropzone = (onFiles, selector = ".upload-section") => {
    if (!toolDropzoneReady) {
        toolDropzoneReady = true;
        // without this the browser navigates to the dropped file
        $(document).on("dragover drop", (e) => e.preventDefault());
        // a drop or a cancel outside the zone must not leave the label stuck
        $(document).on("drop dragend", () => $(".is-dragging").removeClass("is-dragging"));
    }

    if (toolDropzones.has(selector)) return;
    toolDropzones.add(selector);

    $(document).on("dragenter dragover", selector, function (e) {
        e.preventDefault();
        dropzoneTarget(this).addClass("is-dragging");
    });

    $(document).on("dragleave", selector, function (e) {
        if (!this.contains(e.originalEvent.relatedTarget)) {
            dropzoneTarget(this).removeClass("is-dragging");
        }
    });

    $(document).on("drop", selector, function (e) {
        e.preventDefault();
        dropzoneTarget(this).removeClass("is-dragging");
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length) {
            onFiles(files, e);
        }
    });
};

const toggleDownloadTooltip = ($btn, action, label = "Downloading...") => {
    if (action === "show") {
        $btn.addClass("download-tooltip").find(".download-tooltip-text").remove();
        const $tooltip = $('<span class="download-tooltip-text"></span>').text(label).appendTo($btn);
        const rect = $tooltip[0].getBoundingClientRect();
        const shift = Math.max(8 - rect.left, Math.min(0, window.innerWidth - 8 - rect.right));
        $tooltip.css("--tooltip-shift", `${shift}px`);
    } else {
        setTimeout(() => $btn.find(".download-tooltip-text").remove(), 1000);
    }
};
