export function getErrorMessageFromResponseSync(response) {
  return "Failed to fetch resource ".concat(response.url, "(").concat(response.status, "): ").concat(response.statusText, " ");
}
export async function getErrorMessageFromResponse(response) {
  let message = "Failed to fetch resource ".concat(response.url, " (").concat(response.status, "): ");
  try {
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      message += await response.text();
    } else {
      message += response.statusText;
    }
  } catch (error) {
    return message;
  }
  return message;
}
//# sourceMappingURL=fetch-error-message.js.map