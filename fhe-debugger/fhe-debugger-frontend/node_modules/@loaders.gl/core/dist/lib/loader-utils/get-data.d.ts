import type { DataType, SyncDataType, BatchableDataType, Loader, LoaderOptions } from '@loaders.gl/loader-utils';
export declare function getArrayBufferOrStringFromDataSync(data: SyncDataType, loader: Loader, options: LoaderOptions): ArrayBuffer | string;
export declare function getArrayBufferOrStringFromData(data: DataType, loader: Loader, options: LoaderOptions): Promise<ArrayBuffer | string>;
export declare function getAsyncIterableFromData(data: BatchableDataType, options: LoaderOptions): Promise<AsyncIterable<ArrayBuffer> | Iterable<ArrayBuffer>>;
export declare function getReadableStream(data: BatchableDataType): Promise<ReadableStream>;
//# sourceMappingURL=get-data.d.ts.map