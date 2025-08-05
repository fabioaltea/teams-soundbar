import express from 'express'
import bodyParser from 'body-parser'
import process from 'process';
import cors from 'cors';
import { sounds } from './sounds';
import { DbHelper } from './DbHelper';



const app = express()
const port = process.env.PORT || 8080
const RECALL_API_KEY = process.env.RECALL_API_KEY;

const corsOptions = {
    origin: process.env.ORIGIN_URL || 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'refresh_token'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
    credentials: true
}

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use((req, res, next) => {
    console.log('Passing through express. REQ:', req.method, req.url);
    next();
});


app.get('/', (req: any, res: any) => {
    res.send("API Working")
})


app.get("/invite", async (req: any, res: any) => {
  console.log("Received request to invite bot");
  const meetingUrl = req.query.meeting_url as string;

  if (!meetingUrl) {
    return res.status(400).json({ error: "Missing meeting_url" });
  }

  const url = decodeURI(meetingUrl);
  const urlObj = new URL(url);
  const context = urlObj.searchParams.get("context");
  let contextObj: any = {};
  if (context) {
    try {
      contextObj = JSON.parse(context);
    } catch (e) {
      console.error("Failed to parse context:", e);
      return res.status(400).json({ error: "Invalid context JSON" });
    }
  }
  const tenantId = contextObj?.TiD;
  const meetingId = url.substring(
    url.lastIndexOf("/19:meeting_") + 1,
    url.lastIndexOf("@thread.v2/0")
  );

      console.log("Looking for bot already in meeting:", meetingId);
  const db = new DbHelper();
  const existingBotId = await db.getMeetingBot(meetingId);
  if (existingBotId && existingBotId !== "") {
    console.log("Existing bot for requested meeting:", existingBotId);
    res.json({
      Id: existingBotId,
      meetingUrl: meetingUrl,
      soundsCatalog: sounds,
    });
  } else {
    console.log("Any existing bot found for requested meeting. Now creating new bot for meeting:", meetingId);
    try {
      const response = await fetch("https://us-west-2.recall.ai/api/v1/bot", {
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

      const bot: any = await response.json();

      if (!bot || !bot.id) {
        console.error("Recall API response missing bot id:", bot);
        return res
          .status(500)
          .json({ error: "Recall API response missing bot id", bot });
      }

      await db.addMeetingBot(meetingId, bot.id);

      res.json({ Id: bot.id, meetingUrl: meetingUrl, soundsCatalog: sounds });
    } catch (error) {
      console.error("Recall API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/play", async (req: any, res: any) => {
  console.log("Received request to play");

  const botId = req.query.botId;
  const soundId = req.query.soundId as string;

  const sound = sounds.find((s: any) => s.id === soundId);

  console.log("Received request to play for bot:", botId, "sound:", sound);

  if (!botId) {
    return res.status(400).json({ error: "Missing bot ID" });
  }

  try {
    const response = await fetch(
      `https://us-west-2.recall.ai/api/v1/bot/${botId}/output_audio/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${RECALL_API_KEY}`,
        },
        body: JSON.stringify({
          kind: "mp3",
          b64_data: sound?.base64,
        }),
      }
    );

    console.log(
      "Response from Recall API:",
      response.status,
      response.statusText,
      response
    );
    // if (!response.ok) {
    //   throw new Error(`Error playing sound: ${response.statusText}`);
    // }

    res.json({ message: "Sound played successfully" });
  } catch (error) {
    console.error("Error playing sound:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})   