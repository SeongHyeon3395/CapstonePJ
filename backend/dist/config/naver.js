"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.naverApi = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./env");
exports.naverApi = axios_1.default.create({
    baseURL: 'https://openapi.naver.com/v1/search',
    timeout: 12000,
    headers: {
        'X-Naver-Client-Id': env_1.env.naverClientId,
        'X-Naver-Client-Secret': env_1.env.naverClientSecret,
    },
});
