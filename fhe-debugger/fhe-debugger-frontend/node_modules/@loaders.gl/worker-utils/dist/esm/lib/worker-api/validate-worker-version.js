import { assert } from '../env-utils/assert';
import { VERSION } from '../env-utils/version';
export function validateWorkerVersion(worker) {
  let coreVersion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : VERSION;
  assert(worker, 'no worker provided');
  const workerVersion = worker.version;
  if (!coreVersion || !workerVersion) {
    return false;
  }
  return true;
}
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0],
    minor: parts[1]
  };
}
//# sourceMappingURL=validate-worker-version.js.map