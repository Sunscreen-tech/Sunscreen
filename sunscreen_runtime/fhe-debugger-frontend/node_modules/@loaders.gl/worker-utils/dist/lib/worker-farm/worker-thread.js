"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("../node/worker_threads");
const globals_1 = require("../env-utils/globals");
const assert_1 = require("../env-utils/assert");
const get_loadable_worker_url_1 = require("../worker-utils/get-loadable-worker-url");
const get_transfer_list_1 = require("../worker-utils/get-transfer-list");
const NOOP = () => { };
/**
 * Represents one worker thread
 */
class WorkerThread {
    /** Checks if workers are supported on this platform */
    static isSupported() {
        return ((typeof Worker !== 'undefined' && globals_1.isBrowser) ||
            (typeof worker_threads_1.NodeWorker !== 'undefined' && !globals_1.isBrowser));
    }
    constructor(props) {
        this.terminated = false;
        this._loadableURL = '';
        const { name, source, url } = props;
        (0, assert_1.assert)(source || url); // Either source or url must be defined
        this.name = name;
        this.source = source;
        this.url = url;
        this.onMessage = NOOP;
        this.onError = (error) => console.log(error); // eslint-disable-line
        this.worker = globals_1.isBrowser ? this._createBrowserWorker() : this._createNodeWorker();
    }
    /**
     * Terminate this worker thread
     * @note Can free up significant memory
     */
    destroy() {
        this.onMessage = NOOP;
        this.onError = NOOP;
        this.worker.terminate(); // eslint-disable-line @typescript-eslint/no-floating-promises
        this.terminated = true;
    }
    get isRunning() {
        return Boolean(this.onMessage);
    }
    /**
     * Send a message to this worker thread
     * @param data any data structure, ideally consisting mostly of transferrable objects
     * @param transferList If not supplied, calculated automatically by traversing data
     */
    postMessage(data, transferList) {
        transferList = transferList || (0, get_transfer_list_1.getTransferList)(data);
        // @ts-ignore
        this.worker.postMessage(data, transferList);
    }
    // PRIVATE
    /**
     * Generate a standard Error from an ErrorEvent
     * @param event
     */
    _getErrorFromErrorEvent(event) {
        // Note Error object does not have the expected fields if loading failed completely
        // https://developer.mozilla.org/en-US/docs/Web/API/Worker#Event_handlers
        // https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
        let message = 'Failed to load ';
        message += `worker ${this.name} from ${this.url}. `;
        if (event.message) {
            message += `${event.message} in `;
        }
        // const hasFilename = event.filename && !event.filename.startsWith('blob:');
        // message += hasFilename ? event.filename : this.source.slice(0, 100);
        if (event.lineno) {
            message += `:${event.lineno}:${event.colno}`;
        }
        return new Error(message);
    }
    /**
     * Creates a worker thread on the browser
     */
    _createBrowserWorker() {
        this._loadableURL = (0, get_loadable_worker_url_1.getLoadableWorkerURL)({ source: this.source, url: this.url });
        const worker = new Worker(this._loadableURL, { name: this.name });
        worker.onmessage = (event) => {
            if (!event.data) {
                this.onError(new Error('No data received'));
            }
            else {
                this.onMessage(event.data);
            }
        };
        // This callback represents an uncaught exception in the worker thread
        worker.onerror = (error) => {
            this.onError(this._getErrorFromErrorEvent(error));
            this.terminated = true;
        };
        // TODO - not clear when this would be called, for now just log in case it happens
        worker.onmessageerror = (event) => console.error(event); // eslint-disable-line
        return worker;
    }
    /**
     * Creates a worker thread in node.js
     * @todo https://nodejs.org/api/async_hooks.html#async-resource-worker-pool
     */
    _createNodeWorker() {
        let worker;
        if (this.url) {
            // Make sure relative URLs start with './'
            const absolute = this.url.includes(':/') || this.url.startsWith('/');
            const url = absolute ? this.url : `./${this.url}`;
            // console.log('Starting work from', url);
            worker = new worker_threads_1.NodeWorker(url, { eval: false });
        }
        else if (this.source) {
            worker = new worker_threads_1.NodeWorker(this.source, { eval: true });
        }
        else {
            throw new Error('no worker');
        }
        worker.on('message', (data) => {
            // console.error('message', data);
            this.onMessage(data);
        });
        worker.on('error', (error) => {
            // console.error('error', error);
            this.onError(error);
        });
        worker.on('exit', (code) => {
            // console.error('exit', code);
        });
        return worker;
    }
}
exports.default = WorkerThread;
