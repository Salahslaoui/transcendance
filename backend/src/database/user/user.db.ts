import getDB from "../db";
import Model from "../model";
import WebSocket from "ws";
import { WsDataOut } from "../../helpers/wsUtils";
import { WebsocketService } from "../../helpers/wsUtils";
import ApiModel from "../api/api.db";
type FriendshipAction = "accept"  | "remove";
type GameState = "idle" | "in_game";

export interface User {
    id: number;
    username: string;
    email: string;
    password: string;
    avatar_url: string;
    game_state: GameState;
    provider?: string;
    created_at: string;
};


export interface UserSharableInfo {
    id: number;
    username: string;
    avatar_url: string;
    game_state: GameState;
    is_online: boolean;
    blocker_id?: number | null; // optional-blocker_id
}

export default class UserModel extends Model {
    protected id: number;
    public username: string;
    public email: string;
    public password: string;
    public avatar_url: string;
    public game_state: 'idle' | 'in_game';
    public created_at: string;
    protected static table_name: string = "users";
    protected static keys = ["username", "email", "password", "game_state", "created_at"];

    constructor(user: User) {
        super();
        this.id = user.id;
        this.username = user.username;
        this.email = user.email;
        this.password = user.password;
        this.game_state = user.game_state;
        this.created_at = user.created_at;
        this.avatar_url = user.avatar_url;
    }

    isOnline() {
        const allWs = WebsocketService.getWs(this.id);
        if (!allWs)
            return false;
        for (const entry of allWs) {
            if (entry.ws.OPEN)
                return true;
        }
        return false;
    }

    // Returns the id of the first ws we sent this event to
    // Can be used as CONTROL SOCKET

    async sendViaWs( data: WsDataOut, options: { ignoreOffline?: boolean; excludeWsIds?: number[] } = { ignoreOffline: true }){
        const { ignoreOffline = false, excludeWsIds } = options;
        const conns = WebsocketService.getWs(this.id);
        if ((!conns || conns.length == 0)) {
            if (!ignoreOffline)
                throw Error("User is not online");
            return;
        }
        let sentToId = -1;
        for (const entry of conns) {
            if (excludeWsIds !== undefined && excludeWsIds.includes(entry.id)) continue;
            const ws = entry.ws;
            if (ws.readyState !== WebSocket.OPEN) {
                WebsocketService.removeWs(this.id, ws);
                continue;
            }
            if (sentToId == -1)
                sentToId = entry.id;
            ws.send(JSON.stringify(({success: true, details: data})));
        }
        if (sentToId == -1 && !ignoreOffline)
            throw new Error("User is not online");
        return sentToId;
    }

    getWs() {
        return WebsocketService.getWs(this.id);
    }

    getSharableInfo(blocker_id?: number | null): UserSharableInfo { // optional-blocker_id
        const user = {
            id: this.id,
            username: this.username,
            avatar_url: this.avatar_url,
            game_state: this.game_state,
            is_online: this.isOnline(),
            blocker_id: blocker_id,
        }
        return user;
    }


    static async getUserByApiKey(key: string) {
        const apiKey = await ApiModel.findByField("api_key_hashed", ApiModel.hashApiKey(key));
        if (!apiKey)
            return (null);
        const user = await UserModel.findByField("id", apiKey.user_id);
        return user ? user : null;
    }
}


export async function manageFriendship(action: FriendshipAction, friendshipId: number) {
    const db = await getDB();
    const friendship = await db.get("SELECT * FROM friends WHERE id=?", [friendshipId]);
    if (!friendship)
        throw new Error("Invalid friendshipId");
    const updateStatement = await db.prepare("UPDATE friends SET status=? WHERE id=?");
    switch (action) {
        case "accept":
            await updateStatement.run("accepted", friendshipId);
            break;
        case "remove":
            await db.run("DELETE FROM friends WHERE id = ?", [friendshipId]);
            break;
    }
}
