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
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const process_1 = __importDefault(require("process"));
const cors_1 = __importDefault(require("cors"));
const sounds_1 = require("./sounds");
const DbHelper_1 = require("./DbHelper");
const app = (0, express_1.default)();
const port = process_1.default.env.PORT || 8080;
const RECALL_API_KEY = process_1.default.env.RECALL_API_KEY;
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
app.get("/invite", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received request to invite bot");
    const meetingUrl = req.query.meeting_url;
    if (!meetingUrl) {
        return res.status(400).json({ error: "Missing meeting_url" });
    }
    const url = decodeURI(meetingUrl);
    const urlObj = new URL(url);
    const context = urlObj.searchParams.get("context");
    let contextObj = {};
    if (context) {
        try {
            contextObj = JSON.parse(context);
        }
        catch (e) {
            console.error("Failed to parse context:", e);
            return res.status(400).json({ error: "Invalid context JSON" });
        }
    }
    const tenantId = contextObj === null || contextObj === void 0 ? void 0 : contextObj.TiD;
    const meetingId = url.substring(url.lastIndexOf("/19:meeting_") + 1, url.lastIndexOf("@thread.v2/0"));
    console.log("Looking for bot already in meeting:", meetingId);
    const db = new DbHelper_1.DbHelper();
    const existingBotId = yield db.getMeetingBot(meetingId);
    if (existingBotId && existingBotId !== "") {
        console.log("Existing bot for requested meeting:", existingBotId);
        res.json({
            Id: existingBotId,
            meetingUrl: meetingUrl,
            soundsCatalog: sounds_1.sounds,
        });
    }
    else {
        console.log("Any existing bot found for requested meeting. Now creating new bot for meeting:", meetingId);
        try {
            const response = yield fetch("https://us-west-2.recall.ai/api/v1/bot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${RECALL_API_KEY}`,
                },
                body: JSON.stringify({
                    bot_name: "MIDI4Meeting",
                    meeting_url: meetingUrl,
                    recording_config: null,
                    automatic_audio_output: {
                        in_call_recording: {
                            data: {
                                kind: "mp3",
                                b64_data: "aaa",
                            },
                        },
                    },
                }),
            });
            const bot = yield response.json();
            if (!bot || !bot.id) {
                console.error("Recall API response missing bot id:", bot);
                return res
                    .status(500)
                    .json({ error: "Recall API response missing bot id", bot });
            }
            yield db.addMeetingBot(meetingId, bot.id);
            res.json({ Id: bot.id, meetingUrl: meetingUrl, soundsCatalog: sounds_1.sounds });
        }
        catch (error) {
            console.error("Recall API error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}));
app.get("/play", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received request to play");
    const botId = req.query.botId;
    const soundId = req.query.soundId;
    const sound = sounds_1.sounds.find((s) => s.id === soundId);
    console.log("Received request to play for bot:", botId, "sound:", sound);
    if (!botId) {
        return res.status(400).json({ error: "Missing bot ID" });
    }
    try {
        const response = yield fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/output_audio/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${RECALL_API_KEY}`,
            },
            body: JSON.stringify({
                kind: "mp3",
                b64_data: sound === null || sound === void 0 ? void 0 : sound.base64,
            }),
        });
        console.log("Response from Recall API:", response.status, response.statusText, response);
        // if (!response.ok) {
        //   throw new Error(`Error playing sound: ${response.statusText}`);
        // }
        res.json({ message: "Sound played successfully" });
    }
    catch (error) {
        console.error("Error playing sound:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map