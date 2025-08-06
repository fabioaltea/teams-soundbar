import express from 'express'
import bodyParser from 'body-parser'
import process from 'process';
import cors from 'cors';
import { sounds } from './sounds';
import { DbHelper } from './DbHelper';
import dotenv from 'dotenv';


dotenv.config({ path: './.env' });

const app = express()
const port = process.env.PORT || 8080
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const originUrl = process.env.ORIGIN_URL || 'https://localhost:5173';


const corsOptions = {
    origin: originUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'refresh_token'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
    credentials: true
}

app.use(cors(corsOptions));

app.options('*', cors(corsOptions)) ;

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
  console.log("Received request to invite bot", "recall api key:", process.env.RECALL_API_KEY);
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
  const existingBot= await db.getMeetingBot(meetingId);
  
  if (existingBot) {
    const existingBotId= existingBot.bot_id;
    const existingBotStatus=existingBot.bot_status;
    console.log("Existing bot for requested meeting:", existingBotId);
    res.json({
      Id: existingBotId,
      status:existingBotStatus,
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
                b64_data: "YOURAUDIO",
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

      await db.addMeetingBot(meetingId, bot.id,"pending");

      res.json({ Id: bot.id, status:"pending", meetingUrl: meetingUrl, soundsCatalog: sounds });
    } catch (error) {
      console.error("Recall API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } 
});

app.get("/play", async (req: any, res: any) => {
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

    res.json({ message: "Sound played successfully" });
  } catch (error) {
    console.error("Error playing sound:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/status", async (req: any, res: any) => {
    console.log("Received request for status");
   const meetingUrl = req.query.meeting_url as string;

  if (!meetingUrl) {
    return res.status(400).json({ error: "Missing meeting_url" });
  }

  const url = decodeURI(meetingUrl);
  const meetingId = url.substring(
    url.lastIndexOf("/19:meeting_") + 1,
    url.lastIndexOf("@thread.v2/0")
  );
    const db = new DbHelper();
    const existingBot= await db.getMeetingBot(meetingId);
    if(existingBot && existingBot.bot_id) {
      return res.json({
        botId: existingBot.bot_id,
        status: existingBot.bot_status
      });
    }else{
      return res.status(404).json({ error: "No bot found for this meeting" });
    }

});

app.post("/updateBot", async (req: any, res: any) => {
    try{
        const{data, event}=req.body;
        const botId=data.bot.id;
        console.log("Received request to update bot", botId, "with event", event)

        const db = new DbHelper();
        if(event=="bot.call_ended" || event=="bot.fatal" || event=="bot.done"){
            db.deleteMeetingBot(botId);
        }else {
            if(event=="bot.in_call_recording" || event=="bot.in_call_not_recording"){
                db.updateMeetingBot(botId, "ready");
            }
            if(event=="bot.joining_call"){
                db.updateMeetingBot(botId, "joining");
            }
            if(event=="bot.in_waiting_room"){
                db.updateMeetingBot(botId, "lobby");
            }
        }  
        res.json({status:"OK"})

 }catch(ex){
    res.status(500).json({error:ex})
 }
    
});

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})   