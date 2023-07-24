"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSync = exports.save = void 0;
const encode_1 = require("./encode");
const write_file_1 = require("../fetch/write-file");
async function save(data, url, writer, options) {
    const encodedData = await (0, encode_1.encode)(data, writer, options);
    return await (0, write_file_1.writeFile)(url, encodedData);
}
exports.save = save;
function saveSync(data, url, writer, options) {
    const encodedData = (0, encode_1.encodeSync)(data, writer, options);
    return (0, write_file_1.writeFileSync)(url, encodedData);
}
exports.saveSync = saveSync;
