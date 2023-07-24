export async function* timedBatchIterator(batchIterator, timeout) {
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
//# sourceMappingURL=timed-batch-iterator.js.map