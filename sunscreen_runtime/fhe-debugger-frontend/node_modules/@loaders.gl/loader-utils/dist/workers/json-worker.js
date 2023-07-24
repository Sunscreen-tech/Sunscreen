"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_loader_worker_1 = require("../lib/worker-loader-utils/create-loader-worker");
const json_loader_1 = require("../json-loader");
(0, create_loader_worker_1.createLoaderWorker)(json_loader_1.JSONLoader);
