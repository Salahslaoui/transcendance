import MatchModel from "../database/game/match.db";
import UserModel from "../database/user/user.db";
import { isInXOLobby } from "../routes/tic-tac-toe/lobby-queue";
import { MatchManager } from "./match.logic";

export default class MatchMaking {
    private static playerPool: Map<number, UserModel> = new Map();

    constructor() {
        throw new Error("Can't instantiate MatchMaking");
    }

    private static async getNextPlayers(): Promise<[UserModel, UserModel] | null> {
        const candidates: [number, UserModel][] = [];

        for (const [id, player] of this.playerPool) {
            await player.reload();
            if (player.game_state === "in_game") {
                this.playerPool.delete(id);
            } else if (player.game_state == "idle") {
                candidates.push([id, player]);
            }
            if (candidates.length === 2) break;
        }

    if (candidates.length < 2)
        return null;

    for (const [id] of candidates)
        this.playerPool.delete(id);

    return [candidates[0][1], candidates[1][1]];
    }

    private static async createMatch() {
        const players = await this.getNextPlayers();
        if (!players)
            return false;

        const[user1, user2] = players;
        const match = await MatchModel.create({
            player1_id: user1.getId(),
            player2_id: user2.getId(),
            mode: "1v1",
            game_type: "ping_pong"
        });

        const matchManager = new MatchManager(match, user1, user2, "1v1");
        await matchManager.start();

    }

    static async joinPool(user: UserModel) {
        if (user.game_state === "in_game"
                || this.playerPool.has(user.getId())
                || isInXOLobby(user.getId()))
            return false;
        this.playerPool.set(user.getId(), user);

        while (true) {
            if (!await this.createMatch())
                break;
        }
        return true;
    }

    static isInPool(id: number) {
        return this.playerPool.has(id);
    }

    static async quitPool(id: number) {
        
        return this.playerPool.delete(id);
    }
}
