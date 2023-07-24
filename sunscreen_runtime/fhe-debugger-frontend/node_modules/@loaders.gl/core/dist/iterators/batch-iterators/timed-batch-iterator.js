"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timedBatchIterator = void 0;
/**
 * "Debounces" batches and returns them in groups
 */
async function* timedBatchIterator(batchIterator, timeout) {
    let start = Date.now();
    let batches = [];
    for await (const batch of batchIterator) {
        batches.push(batch);
        if (Date.now() - start > timeout) {
            yield batches;
            start = Date.now();
            batches = [];
        }
    }
    if (batches) {
        yield batches;
    }
}
exports.timedBatchIterator = timedBatchIterator;
