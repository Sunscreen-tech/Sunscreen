"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessageFromResponse = exports.getErrorMessageFromResponseSync = void 0;
function getErrorMessageFromResponseSync(response) {
    return `Failed to fetch resource ${response.url}(${response.status}): ${response.statusText} `;
}
exports.getErrorMessageFromResponseSync = getErrorMessageFromResponseSync;
async function getErrorMessageFromResponse(response) {
    let message = `Failed to fetch resource ${response.url} (${response.status}): `;
    try {
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            message += await response.text();
        }
        else {
            message += response.statusText;
        }
    }
    catch (error) {
        // eslint forbids return in finally statement
        return message;
    }
    return message;
}
exports.getErrorMessageFromResponse = getErrorMessageFromResponse;
