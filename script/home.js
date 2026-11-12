const copyTooltipLabel = $("#copyTooltipLabel").val();
const copiedTooltipLabel = $("#copiedTooltipLabel").val();
const downloadTooltipLabel = $("#downloadTooltipLabel").val();
const downloadedTooltipLabel = $("#downloadedTooltipLabel").val();
const validImageTypes = getValidImageTypes("image-to-text");
const allowedExtensions = getAllowedExtensions(validImageTypes);
const copyImgSrc = `${BASE_URL}web_assets/frontend/img/copy-new.svg`;
const downloadImgSrc = `${BASE_URL}web_assets/frontend/img/download-new.svg`;
const text_not_found_img = `${BASE_URL}web_assets/frontend/img/table-error.jpg`;
const cancelImgSrc = `${BASE_URL}web_assets/frontend/img/icons/cancel.svg`;
const cropImgSrc = `${BASE_URL}web_assets/frontend/img/icons/crop-image.svg`;
const expandImgSrc = `${BASE_URL}web_assets/frontend/img/icons/expand-new.svg`;
const minimize_icon = `${BASE_URL}web_assets/frontend/img/icons/minimize-new.svg?v=1.4`;
const downloadArrow = `${BASE_URL}web_assets/frontend/img/icons/download_dropdown.svg`;
const copyIcon = `${BASE_URL}web_assets/frontend/img/icons/copy-new.svg`;
const tickCopyImgSrc = `${BASE_URL}web_assets/frontend/img/icons/tick-copy-table.svg?v=1.2`;
const downloadIcon = `${BASE_URL}web_assets/frontend/img/icons/download-home.svg`;
const COLLAPSED_HEIGHT = 132;

let tiffLibraryPromise = null;
const formattedIcon =
    `<svg width="20" height="20" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.5 5.375V10.625M8.5 5.375H5.875M8.5 5.375H11.125M3.5 15H13.5C14.6046 15 15.5 14.1046 15.5 13V3C15.5 1.89543 14.6046 1 13.5 1H3.5C2.39543 1 1.5 1.89543 1.5 3V13C1.5 14.1046 2.39543 15 3.5 15Z" stroke="black" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>`;
const htmlCodeIcon = ` <svg width="20" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3.5 5.625H17.5M9.96991 13.4999L11.2823 9.12511M7.875 9.125L6.125 11.3125L7.875 13.5M13.125 9.125L14.875 11.3125L13.125 13.5M5.5 17H15.5C16.6046 17 17.5 16.1046 17.5 15V5C17.5 3.89543 16.6046 3 15.5 3H5.5C4.39543 3 3.5 3.89543 3.5 5V15C3.5 16.1046 4.39543 17 5.5 17Z" stroke="black" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>`;
const markdownIcon = `<svg width="20" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.5625 7.375V12.625M13.5625 12.625L15.3125 10.9844M13.5625 12.625L11.8125 10.9844M5.6875 12.625V7.375L7.875 9.125L10.0625 7.375V12.625M5.5 17H15.5C16.6046 17 17.5 16.1046 17.5 15V5C17.5 3.89543 16.6046 3 15.5 3H5.5C4.39543 3 3.5 3.89543 3.5 5V15C3.5 16.1046 4.39543 17 5.5 17Z" stroke="black" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>`;
const imgConvertArr = [];
const fitFiles = (notify = true) => {
    const count = fitFilesToMode(imgConvertArr, ".selected-img-preview .js-single-img-preview", notify);
    $(".no_of_images").text(count);
    return count;
};
const getHtml = [];

const undoOf = (div) => {
    const view = div.getAttribute("data-view") || "format_text";
    div.undoHistory ||= {};
    return (div.undoHistory[view] ||= { undo: [], redo: [], lastType: "" });
};

let filesName = {};
let fetchUrl = false;
let limitExceedShown;
let index = 0,
    totalRequestCount = 0,
    xhr_array = [],
    // req_key: client-minted, one per job. verify_key: server-minted freshness token.
    req_key = "",
    verify_key = "";
const scriptsToRequire = {
    tiff: {
        src: "https://cdn.rawgit.com/seikichi/tiff.js/master/tiff.min.js",
        id: "tiffjs",
    },
    pdf: {
        src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js",
        id: "pdfjs",
    },
    heic: {
        src: BASE_URL + "web_assets/frontend/script/heic2any.js",
        id: "heicjs",
    }
};
const text_not_found_html = `
    <div class="text_not_found">
        <img src="${text_not_found_img}" width='60' height='60'>
        <div class='d-flex flex-column gap-4px'>
            <b>${$("#notTextFoundHeadingLabel").val()}</b>
            <p>${$("#notTextFoundDetailLabel").val()}</p>
        </div>
    </div>`;

const somethingWentWrong = `
    <div class="text_not_found">
        <img src="${text_not_found_img}" width='60' height='60'>
        <div class='d-flex flex-column gap-4px'>
            <b>Something Went Wrong</b>
            <p>Please try again</p>
        </div>
    </div>`;
const tooManyRequestHTML = `
    <div class="text_not_found">
        <img src="${text_not_found_img}" width='60' height='60'>
        <div class='d-flex flex-column gap-4px'>
            <b>${tooManyRequestHead}</b>
            <p>${tooManyRequestDesc}</p>
        </div>
    </div>`;
const markResultFailed = (count, messageHtml = text_not_found_html) => {
    $(".response-div" + count).html(messageHtml);
    $(`#removecard${count} .remove_card_icon`).removeClass("d-none");
};
$(document).ready(function () {
    window.addEventListener("paste", pasteHandler);

    $(document).on("click", ".js-image-to-show", showLightBox);
    $("#openModalBtn").on("click", () => {
        $("#modalOverlay").css("display", "block");
    });
    $("#closeModalBtn").click(() => {
        $("#modalOverlay").css("display", "none");
    });
    $("#mobileCamera").on("change", (e) => {
        const files = e.target.files;
        if (files.length) {
            appendFilesToArray(files);
        }
        $(e.target).val("");
    });
    $("#file").on("change", function (e) {
        const files = e.target.files;
        if (files.length) {
            appendFilesToArray(files);
        }
        $(e.target).val("");
    });

    $(".js-toggle-url").on("click", (e) => {
        enterUrlPrompt();
    });
    let urlValue;

    function enterUrlPrompt() {
        urlValue = prompt(enterImageUrl);
        if (urlValue === null) {
            return;
        }
        urlValue = urlValue.trim();
        if (urlValue === "") {
            return;
        }
        fetchImage(urlValue);
    }
    $(".js-tool-mode[data-mode='2']").on("click", () => {
        record_user_action(
            `${IS_PREMIUM == 0 ? "Guest user" : IS_PREMIUM == 2 ? "Free user" : "Premium user"} formatted text clicked.`,
            `User clicked the formatted text mode.`,
            2,
            TOOL_ID
        );
    });

    $(document).on("click", ".option_btn", async function () {
        const getCount = $(this).parent().data("count");
        const modeId = $(this).attr("id");
        const div = document.getElementById("imagetotext_resultdiv" + getCount);
        if (!div) return;
        const $div = $(div);
        const currentView = div.getAttribute("data-view") || "format_text";
        if (currentView === "format_text") getHtml[`getHtml${getCount}`] = div.innerHTML;
        else if (currentView === "html_code") getHtml[`getHtml${getCount}`] = div.innerText;
        else if (currentView === "markdown" && !div.innerText.trim()) getHtml[`getHtml${getCount}`] = "";
        const sourceHtml = getHtml[`getHtml${getCount}`] || "";

        if (modeId === "markdown") {
            $div.text(await convertHtmlToMarkdown(sourceHtml)).css("white-space", "pre-wrap");
        } else if (modeId === "html_code") {
            $div.text(sourceHtml).css("white-space", "pre-wrap");
        } else {
            $div.html(sourceHtml).css("white-space", "unset");
        }
        div.setAttribute("contenteditable", "true");
        div.setAttribute("data-view", modeId);
        div.dispatchEvent(new Event("input"));
        $(this).siblings(".option_btn").removeClass("active");
        $(this).addClass("active");
    });

    const resultDiv = "[id^='imagetotext_resultdiv']";
    $(document).on("beforeinput", resultDiv, function (e) {
        const history = undoOf(this);
        if (e.originalEvent.inputType !== history.lastType) {
            history.undo.push(this.innerHTML);
            history.redo = [];
        }
        history.lastType = e.originalEvent.inputType;
    });
    $(document).on("input", resultDiv, function () {
        if (!this.textContent.trim() && !this.querySelector("img, table")) this.innerHTML = "";
    });
    $(document).on("keydown", resultDiv, function (e) {
        const key = e.key.toLowerCase();
        if (!(e.ctrlKey || e.metaKey) || (key !== "z" && key !== "y")) return;
        e.preventDefault();
        const history = undoOf(this);
        const isRedo = key === "y" || e.shiftKey;
        const from = isRedo ? history.redo : history.undo;
        const to = isRedo ? history.undo : history.redo;
        if (!from.length) return;
        to.push(this.innerHTML);
        this.innerHTML = from.pop();
        history.lastType = "";
        this.dispatchEvent(new Event("input"));
    });
    $(document).click(function (event) {
        const $target = $(event.target);
        const $jsToggleChoice = $(".js-toggle-choice");
        const $browseDropContent = $(".browse-drop-content");
        const $openCamera = $(".browse-camera-option");
        // Check if the clicked element is not within .js-toggle-choice or .browse-drop-content
        if (
            !$target.is($jsToggleChoice) &&
            !$target.is($openCamera) &&
            !$target.is($browseDropContent) &&
            !$target.closest($jsToggleChoice).length &&
            !$target.closest($openCamera).length &&
            !$target.closest($browseDropContent).length
        ) {
            $browseDropContent.hide();
        }
    });

    // Add click event handler for .js-toggle-choice
    $(".js-toggle-choice").click(function (event) {
        event.stopPropagation();
        $(".browse-drop-content").toggle();
    });
    $(document).on('paste', '.img-text', function (e) {
        let cd = (e.originalEvent || e).clipboardData;
        if (cd.files && cd.files.length > 0) return e.preventDefault();
        if (cd.getData('text/html')?.includes('<img')) return e.preventDefault();
        if (cd.getData('text/plain')?.startsWith('data:image')) return e.preventDefault();
        if (cd.getData('text/rtf')?.includes('\\pict')) return e.preventDefault();
    });

    $(document).on("click", ".single_expand_btn", function (e) {
        const el = cardEl(e.currentTarget.id);
        if (!el) return;
        const expand = !el.classList.contains("expanded");
        setExpanded(el, expand);
        $(e.currentTarget).find("span").text(expand ? expandedToolTip : expandText);
        $(e.currentTarget).find("img").attr("src", expand ? minimize_icon : expandImgSrc);
    });

    $(".upload-section").on("click", function (e) {
        if (
            !$(e.target).closest(
                ".browse-dropbtn, .js-toggle-url,.send-icon, .file-url, .upload-section-img,.browse-camera-option,#mobileCamera,.option-container", ".ocr_feature"
            ).length
        ) {
            $("#file").trigger("click");
        }
    });
    $("#file").on("click", (e) => {
        e.stopPropagation();
    });
    $(
        ".browse-dropbtn, .js-toggle-url, .send-icon, .file-url, .upload-section-img,.browse-camera-option,#mobileCamera,.option-container", ".ocr_feature"
    ).on("click", function (e) {
        e.stopPropagation();
    });
    $(document).on("click", ".delete-action", function (e) {
        let index = parseInt(
            $(e.currentTarget).closest(".js-single-img-preview").index()
        );
        imgConvertArr.splice(index, 1);
        $(e.currentTarget).closest(".js-single-img-preview").remove();
        if ($(".js-single-img-preview").length == 0) {
            $(".after-img-upload").addClass("d-none");
            $(".upload-section").removeClass("flex-basis-50-per");
            scrollPage();
        }
        fitFiles(false);
    });

    $(document).on("click", ".remove_card_icon", function () {
        $(`#removecard${$(this).attr("data-index")}`).remove();
        $(".no_of_images").text($(".result-waiting-card").length);
        updateDownloadAllVisibility();
        if (!$(".result-waiting-card").length) {
            $(".result-waiting .start-over-btn").trigger("click");
        }
    });

    $(".start-over-btn").on("click", (e) => {
        e.preventDefault();
        window.addEventListener("paste", pasteHandler);
        $(".download-all-btn, .ocr-download-all-btn").addClass("d-none");
        $('.upload-section').css('pointer-events', 'auto');
        $(".review-stars").addClass("d-none");
        $(".upload-section, #jsShadowRoot").removeClass("d-none");
        $(".upload-section").removeClass("flex-basis-50-per");
        $(".result-waiting, .after-img-upload").addClass("d-none");
        $(".selected-img-preview").empty();
        $(".result-waiting-card").remove();
        $(".bottom-review-section").addClass("d-none");
        $(".privacy-disclaimer").removeClass("uploaded").insertAfter(".before-upload");
        imgConvertArr.length = 0;
        filesName.length = 0;
        index = 0;
        totalRequestCount = 0;
        setResultHeadConverting(false);
        limitExceedShown = false;
        $('.js-tool-mode').css('pointer-events', 'auto');
        selectToolMode(TOOL_MODES[0].id);
        // Start Over ends the job: drop both keys so nothing stale is reused.
        req_key = "";
        verify_key = "";
        scrollPage();
    });

    $(document).on("click", ".single_text_copy_btn", async (e) => {
        const count = e.currentTarget.id;
        const isCodeView = !isSimpleResult(count) && activeView(count) !== "format_text";
        const plain = isCodeView ? await viewText(count) : cardText(count);
        const flavors = { "text/plain": new Blob([plain], { type: "text/plain" }) };
        if (!isCodeView) flavors["text/html"] = new Blob([inlineTableStyles(inlineDecorations(count))], { type: "text/html" });
        navigator.clipboard
            .write([new ClipboardItem(flavors)])
            .then(() => {
                const $btn = $(".copy_tooltip" + count);
                const setCopied = (copied) => {
                    $btn.find("span").text(copied ? copiedTooltipLabel : copyTooltipLabel);
                    $btn.find("img").attr("src", copied ? tickCopyImgSrc : copyIcon);
                };
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
    });

    $(document).on("click", ".download_file", async function (e) {
        const count = e.currentTarget.id;
        const format = $(this).data("type") === "docx" ? "docx" : "txt";
        const fileName = `${baseName(count)}.${format}`;
        if (format === "docx") {
            saveBlob(await buildDocxBlob(await viewDocxHtml(count)), fileName);
        } else {
            saveText(await viewText(count), fileName);
        }

        $(".download_tooltip" + count).attr("data-tooltip", downloadedTooltipLabel);
        setTimeout(() => $(".download_tooltip" + count).attr("data-tooltip", downloadTooltipLabel), 1000);
    });

    $(document).on("click", ".ocr-download-all-btn", () => downloadAll("txt"));

    initToolDropzone((files) => appendFilesToArray(files));

    $(".convert-btn").on("click", function (e) {
        const _this = $(e.currentTarget);
        if (_this.hasClass("converting") || _this.is(":disabled")) {
            return;
        }
        if (!fitFiles(false)) {
            return;
        }
        window.removeEventListener("paste", pasteHandler);

        _this.addClass("converting");
        _this.text(converting_text);
        $(".start-over-btn").prop('disabled', true).css("cursor", "not-allowed");
        $('.upload-section').css('pointer-events', 'none');
        $(".delete-action").css("display", "none");
        $(".cropper-btn").addClass("d-none");
        getHtml.length = 0;
        $('.tool-area').css('pointer-events', 'none');
        // New job: mint a fresh req_key and pin it for every file below.
        req_key = emdGenerateReqKey();
        verify_key = "";
        with_cloudflare_captcha(
            false,
            Date.now() / 1000,
            cloudflareCallback,
            "light",
            "#cloudflare_container",
            { wrapEle: _this }
        );
    });
});

const pasteHandler = (e) => {
    for (var i = 0; i < e.clipboardData.items.length; i++) {
        var clipboardItem = e.clipboardData.items[i];
        var type = clipboardItem.type;
        if (clipboardItem.kind != "file") continue;
        if (
            type.indexOf("image") != -1 ||
            type.indexOf("application/pdf") != -1 ||
            type == ""
        ) {
            var blob = clipboardItem.getAsFile();
            appendFilesToArray([blob]);
        } else {
            showValidationPopup(fileTypeNotAllowTitle, supported_format, tryAnotherFile);
        }
    }
};
const getImageDimensions = (base64) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
    });
}
const ajaxCall = async (file, count, dimension, urlLink = '') => {
    $('.js-tool-mode').css('pointer-events', 'none');

    let data = new FormData();
    data.append("base64", file.base64);
    data.append("count", count);
    data.append("_token", $("meta[name='_token']").attr("content"));
    data.append("req_key", req_key);
    data.append("verify_key", verify_key);
    data.append("e_track_key", getETrackKey());
    data.append("tool_id", 1);
    data.append("parent_id", currentMode.parent_id);
    data.append("tool_key", currentMode.tool_key);
    data.append("dimension", dimension);
    data.append(
        "size",
        parseFloat((file.file.size / (1024 * 1024)).toFixed(2)) + " MB"
    );
    data.append("name", file.file.name);
    data.append("ocr_mode", currentMode.id);
    urlLink != '' ? fetchUrl = true : fetchUrl = false;
    if (urlLink !== '') {
        data.append("url", urlLink);
    }
    data.append("fetchUrl", fetchUrl);
    xhr = $.ajax({
        method: "POST",
        url: BASE_URL + currentMode.route,
        timeout: 0,
        contentType: false,
        processData: false,
        mimeType: "multipart/form-data",
        data,
        success: function (response) {
            response = JSON.parse(response);
            // Continuation token for the rest of this job. Never blank it.
            if (response.verify_key) {
                verify_key = response.verify_key;
            }
            const result_text = response.text.trim();
            if (result_text == "") {
                markResultFailed(response.count);
            } else {
                getHtml[`getHtml${response.count}`] = response.text;
                $(".for_result_text").html(response.text.trim());
                const textarea_text = $(".for_result_text").text();
                $(".copy_download" + response.count).removeClass("d-none");
                var $textArea;
                if (currentMode.id !== 1) {
                    $("#imagetotext_resultdiv" + response.count).addClass(
                        "success_count"
                    );
                    $(".ocr_options_" + response.count).removeClass("d-none");
                    document.getElementById(
                        "imagetotext_resultdiv" + response.count
                    ).innerHTML = response.text;
                    $("#imagetotext_resultdiv" + response.count).css({
                        resize: "none",
                        height: COLLAPSED_HEIGHT + "px",
                        overflow: "auto",
                        display: "block",
                    });
                    $textArea = $("#imagetotext_resultdiv" + response.count);
                } else {
                    $("#imagetotext_result" + response.count)
                        .val(textarea_text)
                        .addClass("success_count");
                    $("#imagetotext_result" + response.count).css({
                        resize: "none",
                        height: COLLAPSED_HEIGHT + "px",
                        display: "block",
                    });
                    $textArea = $("#imagetotext_result" + response.count);
                }
                $(".response-div" + count).find(".img-text").removeClass("d-none");
                let el = document.getElementById("imagetotext_resultdiv" + response.count);
                if (!el) {
                    el = document.getElementById("imagetotext_result" + response.count);
                }
                const expandButtons = document.querySelectorAll(
                    `.single_expand_btn[id="${response.count}"]`
                );
                function toggleExpandButton() {
                    if (!el) return;
                    el.style.height = "0px";
                    const contentHeight = el.scrollHeight;
                    el.style.height = el.style.maxHeight =
                        (el.classList.contains("expanded") ? contentHeight : Math.min(contentHeight, COLLAPSED_HEIGHT)) + "px";
                    expandButtons.forEach((btn) =>
                        btn.classList.toggle("d-none", contentHeight <= COLLAPSED_HEIGHT)
                    );
                }
                toggleExpandButton();
                el.addEventListener("input", toggleExpandButton);
                setTimeout(() => {
                    const card = $(".result-waiting-card").first();
                    const cardId = card.attr("data-count");
                    const expandBtn = card.find(".single_expand_btn");
                    if (cardId == response.count && !expandBtn.hasClass("d-none")) {
                        expandBtn.trigger("click");
                    }
                }, 0);
            }
            $("#removecard" + response.count).find(".img-title").addClass("sticky");
            $("#progress" + response.count).addClass("d-none");
            if (!isFeedBackSubmitted) {
                $(".review-stars").removeClass("d-none");
            }
        },
        error: function (errors) {
            // Not always JSON (proxy/500 pages); a throw here would skip the cleanup.
            let errorResponse = {};
            try {
                errorResponse = JSON.parse(errors.responseText) || {};
            } catch (e) {
                errorResponse = {};
            }
            // A rejected request can still carry the next valid token.
            if (errorResponse.verify_key) {
                verify_key = errorResponse.verify_key;
            }
            $("#progress" + count).addClass("d-none");
            if (errors.status == 429) {
                markResultFailed(count, tooManyRequestHTML);
                if (limitReachedDescs[errorResponse.type]) {
                    showLimitModal(limitReachedHeading, limitReachedDescs[errorResponse.type].replace(":value", errorResponse.max_attempts));
                }
            } else if (errors.status == 419) {
                window.location.reload();
            } else if (errors.status == 401) {
                // Expired/invalid verify_key — "No Text Found" would mislead here.
                markResultFailed(count, somethingWentWrong);
            } else {
                markResultFailed(count);
            }
            $(".imagetotext-progress:not(.d-none)").attr("readonly", true);
            $(".imagetotext-progress:not(.d-none)").addClass("d-none");
        },
        complete: () => {
            if (currentMode.id !== 1) {
                $("#removecard" + count).find(".img-title").addClass("flex-column");
            }
            $(".response-div" + count).css("padding", "12px");
            $('.upload-section').css('pointer-events', 'auto');
            $('.js-tool-mode').css('pointer-events', 'auto');
            totalRequestCount--;
            if (totalRequestCount == 0) {
                setResultHeadConverting(false);
                updateDownloadAllVisibility();
                $(".start-over-btn").prop('disabled', false).css("cursor", "pointer");
                $(".result-waiting .start-over-btn").removeClass("d-none");
            }
            $(".delete-action").css("display", "block");
            $(".cropper-btn").removeClass("d-none");
            $("#progress" + count).addClass("d-none");
            if (typeof shouldShowTrustPilotPopup === "function") shouldShowTrustPilotPopup();
            showDiscountPopup();
        },
    });
    xhr_array.push(xhr);
};

const imageToTextConverter = () => {
    totalRequestCount = imgConvertArr.filter((file) => !file.stashed).length;
    if (!totalRequestCount) {
        return;
    }
    $(".no_of_images").text(totalRequestCount);
    setResultHeadConverting(true);
    $(".after-img-upload, .upload-section, #jsShadowRoot").addClass("d-none");
    // start over belongs to the finished job, so keep it hidden until every file is done
    $(".result-waiting .start-over-btn").addClass("d-none");
    $(".result-waiting, .bottom-review-section").removeClass("d-none");
    $(".privacy-disclaimer").addClass("uploaded").insertBefore(".review-stars");
    scrollPage(".tool", 20);
    imgConvertArr.forEach((file, index) => {
        if (file.stashed) return;
        const count = file.count;
        let textarea;
        if (currentMode.id !== 2) {
            textarea = `<textarea
                class="img-text d-none"
                id="imagetotext_result${count}"
                spellcheck="false"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
            ></textarea>`;
        } else {
            textarea = `<div class="img-text d-none" id="imagetotext_resultdiv${count}" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" contenteditable= "true"></div>`;
        }
        const result_waiting_card_html =
            `<div class="result-waiting-card" id="removecard${count}" data-count="${count}">
                <div class="img-title-text">
                    <div class="img-title">
                        <div class="d-flex justify-space-between align-items-center gap-8px p-12px mob_result_head">
                            <div class="image-info-div w-full max-w-300px">
                                <img src="${file.base64}" alt="image preview" class="cursor-pointer js-image-to-show">
                                <div id="fileName${count}">${file.fileName}</div>
                            </div>
                            <div class="text-format-btns d-none ocr_options_${count}" data-count=${count} data-index=${index}>
                                <div id="markdown_captcha${count}" class="markdown_captcha"></div>
                                <button class="option_btn active" id="format_text">
                                    ${formattedIcon}
                                    <span>Formatted</span>
                                </button>
                                <button class="option_btn" id="html_code">
                                    ${htmlCodeIcon}
                                    <span>HTML Code</span>
                                </button>
                                <button class="option_btn" id="markdown">
                                    ${markdownIcon}
                                    <span>Markdown</span>
                                </button>
                            </div>
                            <div class="img-text-copy-download d-none copy_download${count} w-full max-w-300px">
                                <span class="single_text_copy_btn copy_tooltip${count} d-flex" id="${count}">
                                    <img src="${copyIcon}" class="btn-icon" alt="copy" width="20" height="20">
                                    <span class="btn-label">${copyTooltipLabel}</span>
                                </span>
                                <div class="single_download_btn d-flex download_tooltip${count} ${currentMode.id !== 2 ? "d-none" : ""}" id="${count}">
                                    <img src="${downloadIcon}" class="btn-icon" alt="download" width="20" height="20">
                                    <span class="btn-label">${downloadTooltipLabel}</span>
                                    <img src="${downloadArrow}" class="dropdown-arrow" alt="download arrow" width="20" height="20">
                                    <div class="download_menu">
                                        <button id="${count}" class="download_file" data-type="txt">${txtBtn}</button>
                                        <button id="${count}" class="download_file" data-type="docx">${docxBtn}</button>
                                    </div>
                                </div>
                                <div class="single_download_btn download_file download_tooltip${count} ${currentMode.id !== 2 ? "" : "d-none"}" id="${count}" data-type="txt">
                                    <img src="${downloadIcon}" class="btn-icon" alt="download" width="20" height="20">
                                    <span class="btn-label">${downloadTooltipLabel}</span>
                                </div>
                                <span class="single_expand_btn expand_tooltip${count} d-flex d-none" id="${count}">
                                    <img src="${expandImgSrc}" class="btn-icon" alt="expand" width="20" height="20">
                                    <span class="btn-label">${expandText}</span>
                                </span>
                            </div>
                            <img src="${cancelImgSrc}" class="remove_card_icon d-none" data-index="${count}" alt="remove file" width="20" height="20">
                        </div>
                    </div>
                </div>
                <div class="response_div response-div${count}">
                    ${textarea}
                </div>
                <div class="imagetotext-progress" id="progress${count}"></div>
            </div>`;
        $(".result-waiting").append(result_waiting_card_html);
        filesName[count] = {
            name: file.file.name,
        };
        getImageDimensions(file.base64).then(({ width, height }) => {
            const dimension = width + " x " + height;
            ajaxCall(file, count, dimension, file.urlLink ?? '');
        }).catch((error) => {
            ajaxCall(file, count, "", file.urlLink ?? '');
            $('.upload-section').css('pointer-events', 'auto');
        })
    });
};
const cloudflareCallback = (hash, token, body) => {
    $.ajaxSetup({
        headers: {
            "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content"),
        },
    });
    $.ajax({
        type: "POST",
        url: BASE_URL + "emd/captcha-verify/" + Date.now(),
        data: {
            emd_captcha_hash: hash,
            emd_captcha_token: token,
            emd_is_tool_premium: IS_TOOL_PREMIUM,
        },
        success: function (response) {
            // response.req_key is the same token under its legacy name.
            verify_key = response.verify_key || response.req_key || "";
            const wrapEle = body.wrapEle;
            wrapEle.removeClass("converting");
            wrapEle.text(SUBMIT_BTN);
            imageToTextConverter();
        },
        error: function () {
            $(".start-over-btn").prop('disabled', false).css("cursor", "pointer");
            $(".delete-action").css("display", "block");
            $(".cropper-btn").removeClass("d-none");
            $('.upload-section').css('pointer-events', 'auto');
        },
        complete: function () {
            $('.tool-area').css('pointer-events', 'auto');
        }
    });
};

const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
};
const setUploadingState = (busy) => {
    $(".convert-btn").prop("disabled", busy).css("cursor", busy ? "not-allowed" : "pointer");
};

const appendFilesToArray = async (files, type = false, urlLink = '') => {
    setUploadingState(true);
    try {
        await processFilesToArray(files, type, urlLink);
    } finally {
        setUploadingState(false);
    }
};

const processFilesToArray = async (files, type = false, urlLink = '') => {
    limitExceedShown = false;

    if (type === true) {
        $(".selected-img-preview").empty();
        index = 0;
        imgConvertArr = [];
    }

    if (imgConvertArr.length === 0) {
        index = 0;
    }

    files = Object.values(files);
    const prevCount = imgConvertArr.length;

    for (const file of files) {
        if (limitExceedShown) {
            break;
        }
        const fileType = file.type;
        const ext = file.name.toLowerCase().split(".").at(-1).trim();
        if (
            !["heif", "heic"].includes(ext) &&
            !validImageTypes.includes(fileType)
        ) {
            showValidationPopup(fileTypeNotAllowTitle, supported_format, tryAnotherFile);
            continue;
        }
        let base64;
        let processedFile = file;
        try {
            switch (fileType) {
                case "image/tiff":
                    await loadTiffLibrary();
                    base64 = await convertTiffToJpgBase64(file);
                    break;
                case "image/webp":
                    base64 = await convertWebpFileToJpgBase64(file);
                    break;
                case "image/heic":
                    base64 = await convertHeicToImg(file);
                    break;
                case "":
                    if (["heic", "heif"].includes(ext)) {
                        const newFile = new File([file], file.name, {
                            type: `image/${ext}`,
                        });
                        base64 = await convertHeicToImg(newFile);
                    }
                    break;
                case "application/pdf":
                    await loadScript(scriptsToRequire.pdf.src, scriptsToRequire.pdf.id);
                    await convertPdfToImage(file);
                    continue;
                default:
                    base64 = await toBase64(file);
                    break;
            }
        } catch {
            showValidationPopup(invalidFileHead, invalidFileDesc);
            continue;
        }
        await checkAndCreateCard(base64, processedFile, urlLink);
    }

    if (imgConvertArr.length > prevCount && $(window).width() <= 768) {
        scrollPage(".tool", 20);
    }
};

const checkAndCreateCard = async (base64, file, urlLink = '') => {
    return new Promise((resolve) => {
        base64CheckImageExists(base64, (exists) => {
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            const fileName = shortenTheFileName(file.name);

            if (imgConvertArr.filter((file) => !file.stashed).length >= currentMode.per_submission) {
                showLimitModal(limitExced, currentMode.files_message);
                if (IS_PREMIUM == 0) {
                    record_user_action("Guest user popup appeared.", "Guest user limit popup appeared.", 1, TOOL_ID);
                }
                limitExceedShown = true;
                return resolve();
            }

            if (fileSize > currentMode.file_size) {
                showLimitModal(imageSizeForPremium, currentMode.size_message);
                return resolve();
            }

            if (!exists) {
                showValidationPopup(invalidFileHead, invalidFileDesc);
                return resolve();
            }

            if (index === 0) {
                $(".upload-section").addClass("flex-basis-50-per");
                $(".after-img-upload").removeClass("d-none");
            }

            const html = `
            <div class="js-single-img-preview" data-id="${index}">
                <div class="left-preview">
                    <div class="left-preview-inner">
                        <img src="${base64}" class="js-image-to-show cursor-pointer">
                    </div>
                    <div class="detail-preview">
                        <p class="img-preview-name">${fileName}</p>
                        <span class="img-preview-size">${fileSize} MB</span>
                    </div>
                </div>
                <div class="right-preview d-flex align-items-center gap-4px">
                    <div class="d-flex align-items-center cropper-btn">
                        <img src="${cropImgSrc}" alt="crop icon" height="20" width="20">
                    </div>
                    <div class="d-flex align-items-center delete-action" data-index="${index}">
                        <img src="${cancelImgSrc}" height="20" width="20">
                    </div>
                </div>
            </div>`;

            $(".selected-img-preview").append(html);

            imgConvertArr.push({
                fileName,
                file,
                size: file.size,
                base64: base64,
                urlLink,
                count: generateRandomString(6),
            });

            index++;
            fitFiles(false);

            resolve();
        });
    });
};

const convertPdfToImage = async (file) => {
    const pdfData = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    loadingTask.onPassword = function (callback, reason) {
        let msg = "This PDF is password protected. Enter password:";
        if (reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
            msg = "Incorrect password. Try again:";
        }
        const password = prompt(msg);
        if (password !== null) callback(password);
    };

    try {
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pagesToRender = Math.min(numPages);
        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            if (limitExceedShown) {
                return;
            }
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
                canvasContext: context,
                viewport,
            }).promise;
            const base64 = canvas.toDataURL("image/jpeg", 0.85);
            const b64Data = base64.split(",")[1] || "";
            const padding = b64Data.endsWith("==") ? 2 : b64Data.endsWith("=") ? 1 : 0;
            const pageSize = Math.floor((b64Data.length * 3) / 4) - padding;
            const fileObj = { name: `${pageNum}-${file.name}`, size: pageSize };
            await checkAndCreateCard(base64, fileObj);
            canvas.width = 0;
            canvas.height = 0;
        }

    } catch (error) {
        console.error("PDF Load Error:", error);

        if (error.name === "InvalidPDFException") {
            showValidationPopup(invalidPdfFile, invalidPdfFileDesc);
        }
    }
};

const showLightBox = (e) => {
    const imageSrc = $(e.currentTarget).attr("src");

    const lightbox = $('<div id="lightbox" class="lightbox-overlay">').appendTo(
        "body"
    );

    const imageWrapper = $('<div class="lightbox-wrapper">').appendTo(lightbox);
    const lightboxImage = $(`<img src="${imageSrc}" class="lightbox-image">`);
    imageWrapper.append(lightboxImage);

    const closeButton = $('<span class="lightbox-close">&times;</span>');
    imageWrapper.append(closeButton);

    // Close button click
    closeButton.on("click", () => {
        lightbox.remove();
    });

    // Click on overlay background (but not the image or wrapper)
    lightbox.on("click", function (e) {
        if (e.target === this) {
            $(this).remove();
        }
    });
};

$(document).on("click", function (e) {
    const $btn = $(e.target).closest(".single_download_btn, .download-all-btn, .hist_download_btn");
    const $menu = $btn.find(".download_menu");
    const $arrow = $btn.find(".dropdown-arrow");
    if ($btn.length) {
        e.stopPropagation();
        const isOpen = $menu.is(":visible");
        $(".download_menu").hide();
        $(".dropdown-arrow").removeClass("rotate-arrow");
        $menu.toggle(!isOpen);
        $arrow.toggleClass("rotate-arrow", !isOpen);
    } else {
        $(".download_menu").hide();
        $(".dropdown-arrow").removeClass("rotate-arrow");
    }
});

async function convertHtmlToMarkdown(html) {
    if (typeof TurndownService === 'undefined') {
        await loadScript("https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js", "markdownJS");
    }

    const source = String(html)
        .replace(/<svg[\s\S]*?<\/svg>/gi, " 🔽 ")
        .replace(/<img[\s\S]*?>/gi, " 🔽 ");

    const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced"
    });

    turndownService.addRule("lineBreaks", {
        filter: ["br"],
        replacement: () => "  \n"
    });

    turndownService.addRule("paragraphSpacing", {
        filter: ["p"],
        replacement: (content) => "\n\n" + content + "\n\n"
    });

    turndownService.addRule("pageBreaks", {
        filter: (node) => node.nodeName === "PAGEBREAK",
        replacement: () => "\n\n---\n\n"
    });

    turndownService.addRule("tables", {
        filter: ["table"],
        replacement: (content, node) => {
            const rows = Array.from(node.rows || []).map((row) =>
                Array.from(row.cells).map((cell) =>
                    (cell.textContent || "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim()
                )
            );
            if (!rows.length) return content;

            const caption = (node.caption?.textContent || "").replace(/\s+/g, " ").trim();
            const width = Math.max(...rows.map((row) => row.length));
            const line = (row) => "| " + row.concat(Array(width - row.length).fill("")).join(" | ") + " |";
            const divider = "| " + Array(width).fill("---").join(" | ") + " |";
            return "\n\n" + (caption ? caption + "\n\n" : "") + [line(rows[0]), divider].concat(rows.slice(1).map(line)).join("\n") + "\n\n";
        }
    });

    return turndownService.turndown(source.trim());
}

const cardEl = (count) =>
    document.getElementById("imagetotext_result" + count) ||
    document.getElementById("imagetotext_resultdiv" + count);

const setExpanded = (el, expand) => {
    el.style.height = el.style.maxHeight =
        (expand ? el.scrollHeight : COLLAPSED_HEIGHT) + "px";
    el.classList.toggle("expanded", expand);
};


const isSimpleResult = (count) => !!document.getElementById("imagetotext_result" + count);

const activeView = (count) =>
    document.getElementById("imagetotext_resultdiv" + count)?.getAttribute("data-view") || "format_text";

const escapeHtml = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inlineTableStyles = (html) => {
    const box = document.createElement("div");
    box.innerHTML = html;
    if (!box.querySelector("table")) return html;
    box.querySelectorAll("table").forEach((t) => {
        t.style.cssText = "border-collapse:collapse;border:1px solid #f1eded";
    });
    box.querySelectorAll("th, td").forEach((c) => (c.style.cssText = "border:1px solid #f1eded;padding:8px"));
    return box.innerHTML;
};

const inlineDecorations = (count) => {
    const el = cardEl(count);
    if (isSimpleResult(count) || !el) return cardHtml(count);
    const clone = el.cloneNode(true);
    const dst = clone.querySelectorAll("*");
    el.querySelectorAll("*").forEach((node, i) => {
        const line = getComputedStyle(node).textDecorationLine;
        if (line && line !== "none" && dst[i]) dst[i].style.textDecoration = line;
    });
    return clone.innerHTML;
};

const formattedHtml = (count) => {
    const div = document.getElementById("imagetotext_resultdiv" + count);
    return div && activeView(count) === "format_text" ? div.innerHTML : getHtml[`getHtml${count}`] || "";
};

const cardHtml = (count) =>
    isSimpleResult(count) ? `<p>${escapeHtml(cardEl(count).value || "").replace(/\n/g, "<br>")}</p>` : formattedHtml(count);

const htmlToPlainText = (html) => {
    const root = document.body.appendChild(document.createElement("div"));
    root.style.cssText = "position:fixed;left:-99999px;top:0";
    root.innerHTML = html || "";
    let out = "";
    const walk = (node) => node.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
            const pre = /^pre/.test(getComputedStyle(n.parentNode).whiteSpace);
            const t = pre ? n.textContent : n.textContent.replace(/\s+/g, " ");
            if (pre || t !== " " || (out && !/\s$/.test(out))) out += t;
        } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "BR") {
            out += "\n";
        } else if (n.nodeType === Node.ELEMENT_NODE) {
            const d = getComputedStyle(n).display;
            if (d === "none") return;
            const cell = d === "table-cell", block = !cell && d !== "contents" && !d.startsWith("inline");
            if (block && out && !/\n$/.test(out)) out += "\n";
            walk(n);
            out += cell ? "\t" : (block && !/\n$/.test(out) ? "\n" : "");
        }
    });
    walk(root);
    root.remove();
    return out.replace(/[ \t]+\n/g, "\n").trim();
};

const cardText = (count) =>
    isSimpleResult(count) ? (cardEl(count).value || "") : htmlToPlainText(formattedHtml(count));

const viewText = async (count) =>
    activeView(count) === "format_text" ? cardText(count)
        : document.getElementById("imagetotext_resultdiv" + count).innerText;

const viewDocxHtml = async (count) => {
    const view = activeView(count);
    if (view === "format_text") return cardHtml(count);
    const code = await viewText(count); // live, edit-aware code text
    return `<p>${escapeHtml(code).replace(/\n/g, "<br>")}</p>`;
};

const baseName = (count) => {
    const name = filesName[count]?.name || "image";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
};

const saveBlob = (blob, fileName) => {
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName });
    link.click();
    URL.revokeObjectURL(link.href);
};
const saveText = (text, fileName, mime = "text/plain") =>
    saveBlob(new Blob([text], { type: mime }), fileName);

const buildDocxBlob = async (html) => {
    await loadScript(`${BASE_URL}web_assets/frontend/script/docx-parse-lib.js`, "docxparsejs");
    return createDocx(html);
};

let resultHeadLabel = "";
const setResultHeadConverting = (on) => {
    const $label = $(".images_text");
    resultHeadLabel ||= $label.text();
    $label.text(on ? converting_text : resultHeadLabel);
};

const updateDownloadAllVisibility = () => {
    const $success = $(".result-waiting-card .success_count");
    if ($success.length < 2) {
        $(".download-all-btn, .ocr-download-all-btn").addClass("d-none");
        return;
    }
    const hasFormatted = $success.filter("[id^='imagetotext_resultdiv']").length > 0;
    $(".download-all-btn").toggleClass("d-none", !hasFormatted);
    $(".ocr-download-all-btn").toggleClass("d-none", hasFormatted);
};

const downloadAll = async (format) => {
    try {
        const cards = $(".result-waiting-card").toArray().filter((el) => !$(el).find(".text_not_found").length);
        if (!cards.length) return;

        if (format === "formatted") {
            const html = cards
                .map((el, i) => {
                    const content = cardHtml($(el).attr("data-count"));
                    return content ? `<p><strong style="color:red;">File ${i + 1}</strong></p><div>${content}</div><pagebreak></pagebreak>` : "";
                })
                .join("");
            return saveBlob(await buildDocxBlob(html), "image-to-text.docx");
        }

        if (!window.JSZip) {
            document.getElementById("jszip")?.remove();
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js", "jszip");
            if (!window.JSZip) throw new Error("JSZip could not be loaded");
        }
        const zip = new JSZip();
        const used = {};
        for (const el of cards) {
            const count = $(el).attr("data-count");
            const text = format === "markdown" ? await convertHtmlToMarkdown(cardHtml(count))
                : format === "txt" ? cardText(count) : cardHtml(count);
            const ext = format === "markdown" ? "md" : format === "txt" ? "txt" : "html";
            let name = `${baseName(count)}.${ext}`;
            if (used[name]) name = name.replace(new RegExp(`\\.${ext}$`), `_${used[name]++}.${ext}`);
            else used[name] = 1;
            zip.file(name, text);
        }
        saveBlob(await zip.generateAsync({ type: "blob" }), "image-to-text.zip");
    } catch (error) {
        console.error("Error while creating download:", error);
    }
};

$(document).on("click", ".download_all", (e) => downloadAll($(e.currentTarget).data("type")));

const fetchImage = async (inputUrl) => {
    setUploadingState(true);
    try {
        await fetchImageFromUrl(inputUrl);
    } finally {
        setUploadingState(false);
    }
};

const fetchImageFromUrl = async (inputUrl) => {
    const inputVal = inputUrl.trim();
    const isValidUrl = await isValidURL(inputVal);
    if (isValidUrl == false) {
        showValidationPopup(
            invalidUrlTitle,
            invalidUrlDesc,
            tryAnotherUrl
        );
        return;
    }
    if (!inputVal) {
        showValidationPopup(
            noUrlTitle,
            noUrlDesc,
            tryAnotherUrl
        );
        return;
    }

    const type = await getAccurateFileType(inputVal);

    if (type === "unknown") {
        $(".file-url").val("");
        showValidationPopup(
            unsupportedUrlTitle,
            unsupportedUrlDesc,
            tryAnotherUrl
        );
        return;
    }

    await new Promise((resolve) => {
        checkIfFileExistsAndIsValid(inputVal, type, (exists) => {
            if (!exists) {
                $(".file-url").val("");
                showValidationPopup(
                    invalidUrlTitle,
                    urlNotFoundDesc,
                    tryAnotherUrl
                );
                return resolve();
            }

            urlToFileList(inputVal, type)
                .then(async (fileList) => {
                    if (!fileList) {
                        throw new Error("Invalid file content");
                    }
                    let urlLink = inputVal;
                    await appendFilesToArray(fileList, false, urlLink);
                    $(".file-url").val("");
                })
                .catch(() => {
                    showValidationPopup(
                        invalidUrlTitle,
                        urlNotLoadedDesc,
                        tryAnotherUrl
                    );
                })
                .finally(resolve);
        });
    });
};

$(document).on("click", ".js-guest-subscription-btn, .plans-pricing-btn", function () {
    if (IS_PREMIUM !== 0) return;
    const isSubscribe = $(this).hasClass("js-guest-subscription-btn");
    record_user_action(
        isSubscribe
            ? "Guest user continue to subscribe."
            : "Guest user continue to free.",
        isSubscribe
            ? "Guest user clicked on subscribe button in limit exceed popup."
            : "Guest user clicked on continue to free button in limit exceed popup.",
        1,
        TOOL_ID
    );
});
const loadTiffLibrary = async () => {

    if (window.Tiff) return;

    if (!tiffLibraryPromise) {

        tiffLibraryPromise = loadScript(
            scriptsToRequire.tiff.src,
            scriptsToRequire.tiff.id
        ).then(() => {

            if (!window.Tiff) {
                throw new Error("Tiff not loaded");
            }

        });

    }

    return tiffLibraryPromise;
};
const showDiscountPopup = () => {
    if (typeof showDiscPopup === "undefined" || !showDiscPopup || $(".disc-popup").length) return;
    const closedAt = Number(getCookie(`disc_popup_closed_${TOOL_ID}`));
    if (closedAt && new Date().getTime() - closedAt < 24 * 60 * 60 * 1000) return;
    if (getCookie(`disc_popup_closed_forever_${TOOL_ID}`)) return;
    const popupHtml = `<div class="disc-popup d-none discount-popup-clicked">
            <div class="d-flex flex-column gap-4px justify-content-center align-items-center">
                <div class="pecita yellow">${discPopupWelcome}</div>
                <div class="rammetto-font large">${discPopupTitle}</div>
            </div>
            <div class="limited">${limitedTime}</div>
            <div class="d-flex flex-column gap-4px justify-content-center align-items-center">
                <div class="rammetto-font regular">${discPopupSubtitle}</div>
                <div class="rammetto-font medium">${discPopupOffer}</div>
            </div>
            <div class="redirect">${discPopupBtn}</div>
            <img class="disc-close" src="${BASE_URL}web_assets/frontend/_img/trustPilot-close.svg" alt="Close" width="16" height="16">
        </div>`;
    $("body").append(popupHtml);
    $(".disc-close").on("click", (e) => {
        e.stopPropagation();
        $(".disc-popup").removeClass("show");
        setTimeout(() => $(".disc-popup").remove(), 400);
        setRouteCookie(`disc_popup_closed_${TOOL_ID}`, new Date().getTime(), 7);
    });
    $(".disc-popup").on("click", () => {
        window.open(`${BASE_URL}premium`, "_blank");
        $(".disc-popup").remove();
        setRouteCookie(`disc_popup_closed_forever_${TOOL_ID}`, new Date().getTime(), 10000);
    });
    const showPopup = () => {
        $(".disc-popup").removeClass("d-none");
        setTimeout(() => $(".disc-popup").addClass("show"), 50);
    };
    if ($("#disc-popup-css").length) return showPopup();
    const fontsReady = Promise.all([
        loadStyle("https://fonts.googleapis.com/css2?family=Rammetto+One&display=block", "rammetto-font-css"),
        loadStyle("https://fonts.cdnfonts.com/css/pecita", "pecita-font-css"),
    ])
        .then(() => Promise.all([document.fonts.load("1em 'Rammetto One'"), document.fonts.load("1em 'pecita'")]))
        .catch(() => {});
    Promise.all([loadStyle(`${BASE_URL}web_assets/frontend/css/disc-popup.css${FILE_VERSION}`, "disc-popup-css"), fontsReady])
        .then(showPopup)
        .catch(() => {
            $("#disc-popup-css").remove();
            $(".disc-popup").remove();
        });
};
