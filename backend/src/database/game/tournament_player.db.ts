import Model from "../model";
import getDB from "../db";

type TournamentPlayerState = "in" | "out";

export interface TournamentPlayer {
    id: number;
    tournament_id: number;
    player_id: number;
    state: TournamentPlayerState;
}

export default class TournamentPlayerModel extends Model {
    protected id: number;
    public tournament_id: number;
    public player_id: number;
    public state: TournamentPlayerState;

    constructor(player: TournamentPlayer) {
        super();
        this.id = player.id;
        this.tournament_id = player.id;
        this.player_id = player.id;
        this.state = player.state;
        this.setKeys();
    }

    static async isATournamentPlayer(userId: number) {
        const db = await getDB();
        const isActive = await db.get("SELECT * FROM tournament_players WHERE player_id=? AND state='in'", userId);
        return (Boolean(isActive));
    }
}