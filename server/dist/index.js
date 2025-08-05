"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const process_1 = __importDefault(require("process"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = process_1.default.env.PORT || 8080;
const corsOptions = {
    origin: process_1.default.env.ORIGIN_URL || 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'refresh_token'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
    credentials: true
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.raw());
app.use((req, res, next) => {
    console.log('Passing through express. REQ:', req.method, req.url);
    next();
});
app.get('/', (req, res) => {
    res.send("API Working");
});
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map