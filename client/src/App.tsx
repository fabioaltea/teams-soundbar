import { useEffect, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import "./App.css";
import { FluentProvider, teamsLightTheme } from "@fluentui/react-components";
import { Share24Regular, Checkmark24Filled, Share16Regular, Checkmark16Filled } from "@fluentui/react-icons";
import { logo } from "./assets/images";
import { SoundBtn } from "./SoundBtn";

function App() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [bot, setBot] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [meetingUrl, setMeetingUrl] = useState<string>(
    new URLSearchParams(window.location.search).get("meeting") || ""
  );
  const [meetingId, setMeetingId] = useState<string>("");
  const [sounds, setSounds] = useState<any[]>();
  const [status, setStatus] = useState("");

  useEffect(() => {
    microsoftTeams.app.initialize().then(() => {
      microsoftTeams.app.getContext().then((context) => {
        console.log("Teams context:", context);
        const meetingId = atob(context?.meeting?.id ?? "")
          .replace("#0", "")
          .replace("0#", "");
        const userId = context?.user?.id ?? "";
        const tenantId = context?.user?.tenant?.id ?? "";
        const uri = `https://teams.microsoft.com/l/meetup-join/${meetingId}/0?context=%7b%22Tid%22%3a%22${tenantId}%22%2c%22Oid%22%3a%22${userId}%22%7d`;
        setMeetingUrl(uri);
      });
    });
  }, []);

  useEffect(() => {
    if (meetingUrl && meetingUrl != "") {
      const meetingNumericIdMatch = meetingUrl.match(/meet\/(\d+)/);
      if (meetingNumericIdMatch && meetingNumericIdMatch[1]) {
        setMeetingId(meetingNumericIdMatch[1]);
      }
    } else {
      setMeetingId("");
    }
  }, [meetingUrl]);



  useEffect(() => {
    if (bot && meetingId) {
      const interval = setInterval(async () => {
        console.log("Checking bot status...");
        const b = await fetch(`${apiUrl}/status?meeting_id=${meetingId}`).then(
          (response) => response.json()
        );
        if (b && b.status) setStatus(b.status);
        else {
          setStatus("");
          setBot(null);
          clearInterval(interval);
        }
      }, 5000);
    } else {
      setStatus("");
      setBot(null);
    }
  }, [bot]);

  const handleInviteBot = async () => {
    const bot = await fetch(`${apiUrl}/invite?meeting_url=${meetingUrl}`).then(
      (response) => response.json()
    );
    setBot(bot.Id);
    setStatus(bot.status);
    setSounds(bot.soundsCatalog || []);
  };

  const handlePlaySound = async (id: string) => {
    setActiveSound(id);
    await fetch(`${apiUrl}/play?soundId=${id}&botId=${bot}`);
    setTimeout(() => {
      setActiveSound(null);
    }, 5000); // Simulate a delay for the sound to play
  };

  return (
    <FluentProvider theme={teamsLightTheme}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginTop: 20,
        }}
      >
        <img style={{ width: "150px", height: "150px" }} src={logo} alt="" />
        <span className="app-title">MIDI4Meeting</span>
        <div className="container">
          <input
            type="text"
            placeholder="Meeting Url"
            className="meeting-url-input"
            value={meetingUrl}
            onChange={(ev) => {
              setBot(null);
              setMeetingUrl(ev.currentTarget.value);
            }}
          />
          <button
            className={`invite-btn ${status}`}
            onClick={handleInviteBot}
            disabled={status != ""}
          >
            {(!status || status == "") && "Join"}
            {status == "pending" && "Pending"}
            {status == "joining" && "Joining"}
            {status == "lobby" && "In Lobby"}
            {status == "ready" && "In Call"}
          </button>
          <button className={`generic-btn`} style={{paddingTop:10}}  onClick={() => {
                  const currentUrl: string = window.location.href;
                  navigator.clipboard.writeText(
                    `${currentUrl}?meeting=${meetingUrl}`
                  );
                  setCopied(true);
                  setTimeout(() => {
                    setCopied(false);
                  }, 2000);
                }}>
            {!copied ? (
              <Share16Regular/>
            ) : (
              <Checkmark16Filled/>
            )}
          </button>
        </div>
        {status && status != "" && sounds && sounds.length > 0 && (
          <div
            className="container"
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "start",
              padding: "8px",
              gap: "8px",
            }}
          >
            {sounds &&
              sounds.map((sound, index) => (
                <SoundBtn
                  key={index}
                  sound={sound}
                  onPlay={handlePlaySound}
                  disabled={!bot || status != "ready"}
                  active={activeSound === sound.id}
                />
              ))}
          </div>
        )}
      </div>
    </FluentProvider>
  );
}

export default App;
