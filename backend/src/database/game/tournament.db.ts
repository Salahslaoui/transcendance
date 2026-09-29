import getDB from "../db";
import Model from "../model";

export interface Tournament {
    id: number;
    name: string;
    creator_id: number;
    state: "pending" | "ongoing" | "finished";
    max_player_count: number;
    current_player_count: number;
    created_at: string;
}

export default class TournamentModel extends Model {
    protected id: number;
    public name: string;
    public creator_id: number;
    public state: "pending" | "ongoing" | "finished";
    public max_player_count: number;
    public current_player_count: number;
    public created_at: string;
    protected static keys = [
        "id",
        "name",
        "creator_id",
        "state",
        "max_player_count",
        "current_player_count",
        "created_at"
    ];
    
    constructor(tournament: Tournament) {
        super();
        this.id = tournament.id;
        this.name = tournament.name;
        this.creator_id = tournament.creator_id;        
        this.state = tournament.state;
        this.max_player_count = tournament.max_player_count;
        this.current_player_count = tournament.max_player_count;
        this.created_at = tournament.created_at;
    }

    static async getTournamentByUser(userId: number) {
        const db = await getDB();
        const tournament = await db.get<Tournament>("SELECT * FROM tournaments WHERE creator_id=?", userId);
        if (!tournament)
            return tournament;
        return new TournamentModel(tournament);
    }
}




