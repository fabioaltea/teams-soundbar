"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHelper = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
class DbHelper {
    constructor() {
        dotenv_1.default.config({ path: './.env' });
        console.log("connecting to db with", process.env.DATABASE_URL);
        this._pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false,
            },
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._pool.connect();
            try {
                const { rows } = yield client.query("SELECT * FROM bots");
                return rows;
            }
            finally {
                client.release();
            }
        });
    }
    getMeetingBot(meetingId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._pool.connect();
            try {
                const { rows } = yield client.query("SELECT bot_id, bot_status FROM bots WHERE meeting_id = $1", [meetingId]);
                console.log("Query executed to get bot for meeting:", meetingId, "Result rows:", rows);
                return rows.length > 0 ? rows[0] : null;
            }
            finally {
                client.release();
            }
        });
    }
    addMeetingBot(meetingId, botId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._pool.connect();
            try {
                yield client.query("INSERT INTO bots (meeting_id, bot_id, bot_status) VALUES ($1, $2, $3)", [meetingId, botId, status]);
            }
            finally {
                client.release();
            }
        });
    }
    deleteMeetingBot(botId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._pool.connect();
            try {
                yield client.query("DELETE FROM bots WHERE bot_id = $1", [botId]);
            }
            finally {
                client.release();
            }
        });
    }
    updateMeetingBot(botId, botStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._pool.connect();
            try {
                yield client.query("UPDATE bots SET bot_status = $1 WHERE bot_id = $2", [botStatus, botId]);
            }
            catch (ex) {
                throw ex;
            }
            finally {
                client.release();
            }
        });
    }
}
exports.DbHelper = DbHelper;
//# sourceMappingURL=DbHelper.js.map