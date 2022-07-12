// Converts the browser runtime call into a promise to more easily fetch the results
function getFromBackgroundPage(payload, ignoreErrors = true) {
    console.log(payload)
    return new Promise((resolve, reject) => {
        browser.runtime.sendMessage(payload, (response) => {
            const error = browser.runtime.lastError;
            if (!ignoreErrors && error) {
                reject(error);
                return;
            }

            if (!ignoreErrors && response.success === false) {
                reject(response.error);
                return;
            }
            console.log(response.response)
            resolve(response.response);
        });
    });
}

// Convert a hex string (with 6 hex digits) to a rgb string
function hexToRgb(hex) {
    if (!hex) return null;

    const [r, g, b] = hex.substring(1).match(/.{2}/ug)
                         .map((x) => parseInt(x, 16));
    return `rgb(${r}, ${g}, ${b})`;
}

// Convert a rgb string to a hex string
function rgbToHex(rgb) {
    if (!rgb) return null;

    return rgb.replace(
                /^rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)$/ug,
                (m, r, g, b) => {
                    const values = [r, g, b].map((x) => parseInt(x, 10).toString(16).padStart(2, '0'));
                    return `#${values.join('')}`;
                },
            );
}

export { getFromBackgroundPage, hexToRgb, rgbToHex };
