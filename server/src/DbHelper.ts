import { Pool } from "pg";
import dotenv from 'dotenv';

export class DbHelper {
  private _pool: Pool;

  constructor() {
    dotenv.config({ path: './.env' });
    
    console.log("connecting to db with" , process.env.DATABASE_URL)
    this._pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  public async getData() {
    const client = await this._pool.connect();
    try {
      const { rows } = await client.query("SELECT * FROM bots");
      return rows;
    } finally {
      client.release();
    }
  }

  public async getMeetingBot(meetingId: string):Promise<any | null> {
    const client = await this._pool.connect();
    try {
      const { rows } = await client.query("SELECT bot_id, bot_status FROM bots WHERE meeting_id = $1", [meetingId]);
      console.log("Query executed to get bot for meeting:", meetingId, "Result rows:", rows);
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }

public async addMeetingBot(meetingId: string, botId: string): Promise<void> {
    const client = await this._pool.connect();
    const startStatus="pending"
    try {
        await client.query(
            "INSERT INTO bots (meeting_id, bot_id, bot_status) VALUES ($1, $2, $3)",
            [meetingId, botId,startStatus]
        );
    } finally {
        client.release();
    }
}

    public async deleteMeetingBot( botId:string){
      const client = await this._pool.connect();
      try {
        await client.query(
          "DELETE FROM bots WHERE bot_id = $1",
          [botId]
        );
      } finally {
        client.release();
      }
    }

      public async updateMeetingBot(botId: string, botStatus: string): Promise<void> {
        const client = await this._pool.connect();
        try {
          await client.query(
            "UPDATE bots SET bot_status = $1 WHERE bot_id = $2",
            [botStatus, botId]
          );
        }catch(ex){
          throw ex;
        }
         finally {
          client.release();
        }
      }
}
