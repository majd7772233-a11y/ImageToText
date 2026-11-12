let cropper;
let curretCropIndex = null;
let resetArray = [];
let baseZoomRatio = 1;
const MAX_ZOOM_RATIO = 10;

const cropCardSelector = () => $(".js-parent-single-img").length ? ".js-parent-single-img" : ".js-single-img-preview";

$(document).ready(function () {
    $("#cropButton").on("click", function () {
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageUrl = croppedCanvas.toDataURL();
        // Update the image source in the preview
        if (curretCropIndex != null) {
            const croppedIndex = curretCropIndex;
            imgConvertArr[croppedIndex].base64 = croppedImageUrl;
            imgConvertArr[croppedIndex].uploadBlob = new Promise((resolve) => croppedCanvas.toBlob(resolve));
            const imageToReplace = $(cropCardSelector()).eq(curretCropIndex);
            imageToReplace
                .find(".js-image-to-show")
                .attr("src", croppedImageUrl);
        }

        // Close the modal
        $("#imageCropperModal").hide();
        curretCropIndex = null;
    });

    // closing modal on clicking background
    $("#imageCropperModal").on("click", function (e) {
        if (e.target === this) {
            $(this).hide();

            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
        }
    });

    $(document).on("click", ".cropper-btn", function () {
        const parent = $(this).closest(cropCardSelector());
        curretCropIndex = parent.index();
        const imgSrc = imgConvertArr[curretCropIndex]?.base64 || parent.find(".js-image-to-show").attr("src");
        if (!resetArray[curretCropIndex]) {
            resetArray[curretCropIndex] = imgConvertArr[curretCropIndex].base64 || imgSrc;
        }
        openImageModal(imgSrc);
    });

    $(document).on("keydown", function (e) {
        if ((e.key === "Escape" || e.keyCode === 27) && $("#imageCropperModal").is(":visible")) {
            $("#imageCropperModal").css({
                display: "none",
            });
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
        }
    });

    $(document).on("click", "#resetCrop", function () {
        if (!cropper || curretCropIndex === null) return;

        const index = curretCropIndex;
        const original = resetArray[index];
        if (!original) return;

        const apply = () => {
            $(cropCardSelector()).eq(index).find(".js-image-to-show").attr("src", original);
            imgConvertArr[index].base64 = original;
        };

        if ($("#fullImage").attr("src") === original) {
            cropper.reset();
            return apply();
        }

        const preload = new Image();
        preload.onload = preload.onerror = () => {
            if (!cropper || curretCropIndex !== index) return;
            cropper.replace(original);
            apply();
        };
        preload.src = original;
    });

    $(document).on("click", "#rotate-left", function () {
        rotateAndFit(-90);
    });

    $(document).on("click", "#rotate-right", function () {
        rotateAndFit(90);
    });
    $(document).on("click", "#closeCropper", function (e) {
        e.preventDefault();
        $("#imageCropperModal").css("display", "none");
    })
});

const rotateAndFit = (degree) => {
    if (!cropper) return;

    cropper.rotate(degree);
    cropper.clear();

    const container = cropper.getContainerData();
    const canvas = cropper.getCanvasData();
    const scale = Math.min(container.width / canvas.width, container.height / canvas.height);
    const width = canvas.width * scale;
    const height = canvas.height * scale;
    const left = (container.width - width) / 2;
    const top = (container.height - height) / 2;

    cropper.setCanvasData({ left, top, width, height });
    cropper.crop();
    cropper.setCropBoxData({
        left: left + width * 0.35,
        top: top + height * 0.35,
        width: width * 0.3,
        height: height * 0.3,
    });

    baseZoomRatio = cropper.getImageData().width / cropper.getImageData().naturalWidth || 1;
};

const openImageModal = (imageUrl) => {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    const imgEl = document.getElementById("fullImage");

    $("#imageCropperModal").css({
        display: "flex",
    });

    const initCropper = () => {
        cropper = new Cropper(imgEl, {
            dragMode: "crop",
            autoCropArea: 0.3,
            restore: false,
            guides: false,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            viewMode: 1,
            responsive: true,
            minCropBoxWidth: 20,
            minCropBoxHeight: 20,
            ready() {
                const imageData = this.cropper.getImageData();
                baseZoomRatio = imageData.width / imageData.naturalWidth || 1;
            },
            zoom(event) {
                if (event.detail.ratio > baseZoomRatio * MAX_ZOOM_RATIO) {
                    event.preventDefault();
                }
            },
        });
    };

    if (imgEl.getAttribute("src") === imageUrl && imgEl.complete && imgEl.naturalWidth > 0) {
        initCropper();
        return;
    }

    imgEl.onload = () => {
        imgEl.onload = null;
        imgEl.onerror = null;
        initCropper();
    };
    imgEl.onerror = () => {
        imgEl.onload = null;
        imgEl.onerror = null;
    };
    imgEl.src = imageUrl;
};