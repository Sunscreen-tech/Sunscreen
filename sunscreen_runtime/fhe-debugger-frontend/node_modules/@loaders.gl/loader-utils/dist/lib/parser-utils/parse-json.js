"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSON = void 0;
const get_first_characters_1 = require("../binary-utils/get-first-characters");
/**
 * Minimal JSON parser that throws more meaningful error messages
 */
function parseJSON(string) {
    try {
        return JSON.parse(string);
    }
    catch (_) {
        throw new Error(`Failed to parse JSON from data starting with "${(0, get_first_characters_1.getFirstCharacters)(string)}"`);
    }
}
exports.parseJSON = parseJSON;
