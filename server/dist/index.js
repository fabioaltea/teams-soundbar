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
const DbHelper_1 = require("./DbHelper");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './.env' });
const app = (0, express_1.default)();
const port = process_1.default.env.PORT || 8080;
const RECALL_API_KEY = process_1.default.env.RECALL_API_KEY;
const originUrl = process_1.default.env.ORIGIN_URL || 'https://localhost:5173';
const corsOptions = {
    origin: originUrl,
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
    console.log("Received request to invite bot", "recall api key:", process_1.default.env.RECALL_API_KEY);
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
    const existingBot = yield db.getMeetingBot(meetingId);
    const sounds = yield db.getSoundsCatalog();
    if (existingBot) {
        const existingBotId = existingBot.bot_id;
        const existingBotStatus = existingBot.bot_status;
        console.log("Existing bot for requested meeting:", existingBotId);
        res.json({
            Id: existingBotId,
            status: existingBotStatus,
            meetingUrl: meetingUrl,
            soundsCatalog: sounds,
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
                                b64_data: "YOURAUDIO",
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
            yield db.addMeetingBot(meetingId, bot.id, "pending");
            res.json({ Id: bot.id, status: "pending", meetingUrl: meetingUrl, soundsCatalog: sounds });
        }
        catch (error) {
            console.error("Recall API error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}));
app.get("/play", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const botId = req.query.botId;
    const soundId = req.query.soundId;
    const sound = yield new DbHelper_1.DbHelper().getSound(Number(soundId));
    console.log("Received request to play for bot:", botId, "sound:", soundId);
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
                b64_data: sound[0].data,
            }),
        });
        console.log("Response from Recall API:", response.status, response.statusText, response);
        res.json({ message: "Sound played successfully" });
    }
    catch (error) {
        console.error("Error playing sound:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
app.get("/status", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received request for status");
    const meetingUrl = req.query.meeting_url;
    if (!meetingUrl) {
        return res.status(400).json({ error: "Missing meeting_url" });
    }
    const url = decodeURI(meetingUrl);
    const meetingId = url.substring(url.lastIndexOf("/19:meeting_") + 1, url.lastIndexOf("@thread.v2/0"));
    const db = new DbHelper_1.DbHelper();
    const existingBot = yield db.getMeetingBot(meetingId);
    if (existingBot && existingBot.bot_id) {
        return res.json({
            botId: existingBot.bot_id,
            status: existingBot.bot_status
        });
    }
    else {
        return res.status(404).json({ error: "No bot found for this meeting" });
    }
}));
app.get("/sounds", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db = new DbHelper_1.DbHelper();
    try {
        const sounds = yield db.getSoundsCatalog();
        res.json(sounds);
    }
    catch (error) {
        console.error("Error fetching sounds:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
// app.get("/saveSounds", async (req: any, res: any) => {
//     console.log("Received request to save sounds");
//     const db = new DbHelper();
//     try {
//         await db.addSoundsDB(sounds);
//         res.json({ status: "Sounds saved successfully" });
//     } catch (error) {
//         console.error("Error saving sounds:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// })
app.post("/updateBot", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, event } = req.body;
        const botId = data.bot.id;
        console.log("Received request to update bot", botId, "with event", event);
        const db = new DbHelper_1.DbHelper();
        if (event == "bot.call_ended" || event == "bot.fatal" || event == "bot.done") {
            db.deleteMeetingBot(botId);
        }
        else {
            if (event == "bot.in_call_recording" || event == "bot.in_call_not_recording") {
                db.updateMeetingBot(botId, "ready");
            }
            if (event == "bot.joining_call") {
                db.updateMeetingBot(botId, "joining");
            }
            if (event == "bot.in_waiting_room") {
                db.updateMeetingBot(botId, "lobby");
            }
        }
        res.json({ status: "OK" });
    }
    catch (ex) {
        res.status(500).json({ error: ex });
    }
}));
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map