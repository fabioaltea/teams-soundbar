import { useEffect, useState } from 'react'
import * as microsoftTeams from "@microsoft/teams-js";
import './App.css'
import { Button, FluentProvider, Input, Subtitle1, Subtitle2, teamsLightTheme, Title2 } from '@fluentui/react-components';


function App() {
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [bot, setBot]=useState<any>(null);
  const [sounds, setSounds] = useState<any[]>()
  const [status, setStatus]=useState("")
  
  useEffect(() => {
    microsoftTeams.app.initialize().then(() => {
      microsoftTeams.app.getContext().then(context => {
        console.log("Teams context:", context);
        const meetingId=atob(context?.meeting?.id??"").replace("#0", "").replace("0#", "");
        const userId=context?.user?.id??"";
        const tenantId=context?.user?.tenant?.id??"";
        const uri=`https://teams.microsoft.com/l/meetup-join/${meetingId}/0?context=%7b%22Tid%22%3a%22${tenantId}%22%2c%22Oid%22%3a%22${userId}%22%7d`;
        setMeetingUrl(uri);
      });
    });
}, []);

  useEffect(() => {
    const interval=setInterval(async() => {
      if(bot){
        console.log("Checking bot status...");
        const b=await fetch(`https://teams-soundbar-server.vercel.app/status?meeting_url=${meetingUrl}`).then(response => response.json())
        if(b)
          setStatus(b.status)
        else{
          setStatus("")
          setBot(null);
        }
      }
    },5000)
    return () => clearInterval(interval);

  }, [bot]);

  const handleInviteBot = async() => {
    const bot=await fetch(`https://teams-soundbar-server.vercel.app/invite?meeting_url=${meetingUrl}`).then(response => response.json())
    setBot(bot.Id);
    setStatus(bot.status);
    setSounds(bot.soundsCatalog || []);
  }

  const handlePlaySound=async(id:number)=>{
    await fetch(`https://teams-soundbar-server.vercel.app/play?soundId=${id}&botId=${bot}`)
  }

  return (
    <FluentProvider theme={teamsLightTheme}>
      
      <div style={{display:'flex', flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, marginTop:20}}>
                <img style={{width: '150px', height: '150px'}} src="src/assets/logo.png" alt="" />
                <span style={{fontSize:30, fontWeight:"500"}}>MIDI4Meeting</span>
                <div className="meeting-url-container">
                  <input
                  type="text"
                  placeholder="Meeting Url"
                  className="meeting-url-input"
                  value={meetingUrl}
                  onChange={(ev)=>{setBot(null); setMeetingUrl(ev.currentTarget.value);}}
                  />
                  <button
                  className={`invite-btn ${status}`}
                  onClick={handleInviteBot}
                  disabled={status!=""}
                  >
                    {(!status || status=="") && "Join"}
                    {status=="pending" && "Pending"}
                    {status=="joining" && "Joining"}
                    {status=="lobby" && "In Lobby"}
                    {status=="ready" && "In Call"}
                  </button>
                </div>

      <div style={{display:'flex', flexDirection:"row", flexWrap:"wrap", justifyContent:"start", padding:"4px 8px"}}>
          {sounds && sounds.map((sound, index) => (
              <div key={index} className='sound-btn'>
              {sound.name}
              <button
                  className={`invite-btn play`}
                  onClick={()=>handlePlaySound(sound.id)}
                  disabled={status!="ready"}
                  >
                    Play
                  </button>
            </div>
            )
          )}
        </div>
      </div>
    </FluentProvider>
)
}

export default App
