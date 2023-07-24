"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFetchResponseStatusSync = exports.checkFetchResponseStatus = void 0;
async function checkFetchResponseStatus(response) {
    if (!response.ok) {
        let errorMessage = `fetch failed ${response.status} ${response.statusText}`;
        try {
            const text = await response.text();
            if (text) {
                errorMessage += `: ${getErrorText(text)}`;
            }
        }
        catch (error) {
            // ignore error
        }
        throw new Error(errorMessage);
    }
}
exports.checkFetchResponseStatus = checkFetchResponseStatus;
function checkFetchResponseStatusSync(response) {
    if (!response.ok) {
        throw new Error(`fetch failed ${response.status}`);
    }
}
exports.checkFetchResponseStatusSync = checkFetchResponseStatusSync;
function getErrorText(text) {
    // Look for HTML error texts
    const matches = text.match('<pre>(.*)</pre>');
    return matches ? matches[1] : ` ${text.slice(0, 10)}...`;
}
