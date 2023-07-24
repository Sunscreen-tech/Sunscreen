import { getFirstCharacters } from '../binary-utils/get-first-characters';
export function parseJSON(string) {
  try {
    return JSON.parse(string);
  } catch (_) {
    throw new Error("Failed to parse JSON from data starting with \"".concat(getFirstCharacters(string), "\""));
  }
}
//# sourceMappingURL=parse-json.js.map