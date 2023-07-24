import { createLoaderWorker } from '@loaders.gl/loader-utils';
import { CrunchLoader } from '../crunch-loader';
import { parseCrunch } from '../lib/parsers/parse-crunch';
export const CrunchLoaderWithParser = {
  ...CrunchLoader,
  parse: parseCrunch
};
createLoaderWorker(CrunchLoaderWithParser);
//# sourceMappingURL=crunch-worker.js.map