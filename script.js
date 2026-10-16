const imageInput = document.getElementById("imageInput");
const palettePreview = document.getElementById("palettePreview");
const hiddenCanvas = document.getElementById("hiddenCanvas");
const loader = document.getElementById("loader");
const MAX_SIDE = 1200;
const MAX_COLORS = 16;
const SAMPLE_EVERY = 4;

function setLoading(isLoading) {
    loader.classList.toggle("hidden", !isLoading);
}

function showMessage(message) {
    palettePreview.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    palettePreview.appendChild(paragraph);
}

imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showMessage("Please choose a valid image file.");
        imageInput.value = "";
        return;
    }

    setLoading(true);
    palettePreview.replaceChildren();

    const reader = new FileReader();
    reader.onerror = () => {
        setLoading(false);
        showMessage("Could not read this image. Please try another file.");
    };

    reader.onload = () => {
        const img = new Image();
        img.onerror = () => {
            setLoading(false);
            showMessage("This file could not be decoded as an image.");
        };

        img.onload = () => {
            try {
                const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
                const width = Math.max(1, Math.round(img.naturalWidth * scale));
                const height = Math.max(1, Math.round(img.naturalHeight * scale));
                hiddenCanvas.width = width;
                hiddenCanvas.height = height;

                const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });
                if (!ctx) throw new Error("Canvas is unavailable in this browser.");
                ctx.drawImage(img, 0, 0, width, height);

                const pixels = ctx.getImageData(0, 0, width, height).data;
                const colorMap = new Map();

                // Sampling and downscaling prevent large photos from blocking the page
                // or creating thousands of DOM nodes for near-unique pixel colors.
                for (let pixel = 0; pixel < width * height; pixel += SAMPLE_EVERY) {
                    const i = pixel * 4;
                    if (pixels[i + 3] === 0) continue;
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const hex = rgbToHex(r, g, b);
                    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
                }

                const sortedColors = [...colorMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, MAX_COLORS);

                palettePreview.replaceChildren();
                if (sortedColors.length === 0) {
                    showMessage("No visible colors were found in this image.");
                    return;
                }

                for (const [hex] of sortedColors) {
                    const colorBlock = document.createElement("div");
                    colorBlock.classList.add("color-block");

                    const colorSample = document.createElement("div");
                    colorSample.classList.add("color-sample");
                    colorSample.style.backgroundColor = hex;

                    const colorCode = document.createElement("span");
                    colorCode.textContent = hex;

                    colorBlock.append(colorSample, colorCode);
                    palettePreview.appendChild(colorBlock);
                }
            } catch (error) {
                showMessage(error instanceof Error
                    ? "Could not extract colors: " + error.message
                    : "Could not extract colors from this image.");
            } finally {
                setLoading(false);
            }
        };

        img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
});

function rgbToHex(r, g, b) {
    const toHex = component => component.toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
}
