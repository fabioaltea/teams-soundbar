export interface ISound {
    name: string;
    id: string;
    imgUrl: string;
}

export interface ISoundBtnProps {
    sound: ISound;
    onPlay: any;
    disabled?: boolean;
    active?: boolean;
}


export const SoundBtn = ({ sound, onPlay, disabled, active }: ISoundBtnProps) => {

    const handlePlay = (id: string) => {
        onPlay(id);
    }
    return (
        <div className={`sound-btn ${active?"enabled":""}`} onClick={() => { if (!disabled) handlePlay(sound.id) }}>
            {/*<div style={{ width: "100%", display: 'flex', flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>*/}
                {/* <button className={`invite-btn play`} onClick={() => handlePlay(sound.id)} disabled={disabled}>Play</button> */}
                {/* <div style={{width:"inherit", height:"40px", overflow:"hidden", borderRadius:"8px"}}>
            <img
                style={{width:"100%", height:"100%", objectFit:"cover"}}
                src={sound.imgUrl}
                alt=""
            />
            </div> */}
            {/*</div>*/}
            <div style={{ width: "100%", display: 'flex', flexDirection: "row", alignItems: "center", justifyContent: "space-between", fontSize: "10px", fontWeight: 400 }}>
                {sound.name}
                <div>
                    <span
                        className={`status-indicator ${active ? 'enabled' : ''}`}
                        style={{

                        }}
                    />
                </div>
                {/* <img
                style={{width:"50px", height:50, objectFit:"cover"}}
                src={sound.imgUrl}
                alt=""
            /> */}
            </div>
        </div>
    );
};
