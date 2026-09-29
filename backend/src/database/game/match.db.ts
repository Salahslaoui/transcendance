import Model from "../model";


type MatchMode = "matchmaking" | "invite" | "tournament";


export interface Match {
    id: number;
    player1_id: number;
    player2_id: number;
    mode: MatchMode;
    score_player1: number;
    score_player2: number;
    winner_id: number | null;
    tournament_id: number | null;
}


export default class MatchModel extends Model {
    protected id: number;
    public player1_id: number;
    public player2_id: number;
    public mode: MatchMode;
    public score_player1: number;
    public score_player2: number;
    public winner_id: number | null;
    public tournament_id: number | null;
    protected static table_name: string = "match";


    constructor(match: Match) {
        super();
        this.id = match.id;
        this.player1_id = match.player1_id;
        this.player2_id = match.player2_id;
        this.mode = match.mode;
        this.score_player1 = match.score_player1;
        this.score_player2 = match.score_player2;
        this.winner_id = match.winner_id;
        this.tournament_id = match.tournament_id;
        this.setKeys();
    }

}
