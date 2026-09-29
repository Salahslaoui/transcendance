import { WebSocket } from "ws";
import { GameState } from "../game-logic/match.logic";
import { UserSharableInfo } from "../database/user/user.db";
import { XOBoard } from "../routes/tic-tac-toe/game-service";


type GameEventOut = "game_start" | "game_event" | "game_ask_control" | "game_continue" | "game_pause" | "game_end" | "game_score";
type InvitationEventOut = "invitation_delivery" | "invitation_accept" | "invitation_reject";
type InvitTournamentOut = "TournInviteAccept" | "TournInviteReject" | "TournInviteSent" | "Tn_start"
type FriendEventOut = "friend_disconnect" | "friend_connect" | "friend_request" | "friend_add" | "friend_removed";
type BlockedEventOut = "user_blocked" | "self_user_blocked" | "user_unblocked" | "self_user_unblocked";
type ChatMessageEventOut = "arrived_message" | "self_message";
type XOEventOut = "xo_game_end" | "xo_board_change" | "xo_game_start";

type EventIn = "key_up" | "key_down" | "sent_message" | "block_user" | "unblock_user" | "pause_game" | "end_game" | "control_game" | "continue_game" | "xo_join_lobby" | "xo_game_start";
type EventOut =  "socket_register" | "matchmaking_start" | "matchmaking_end" | FriendEventOut | InvitationEventOut | GameEventOut | InvitTournamentOut | BlockedEventOut | ChatMessageEventOut | XOEventOut;

export type GameMode = "tournament" | "1v1";

export interface GameStartInfo {
    against: UserSharableInfo;
    mode: GameMode;
    myDirection: "left" | "right";
    isControl: boolean;
    matchId: number;
}


export interface GameScoreInfo {
    leftScore: number;
    rightScore: number;
}

export interface WsInvitationReject {
    rejectedById: number;
    rejectedByUsername: string;
    invitationId: number;
}

export interface User {
	id: number;
	name: string;
	avatar: string;
	online: boolean;
	gameState: string;
	blockerId: number;
}

export interface WsInvitationOut {
    sentById: number;
    sentByUsername: string;
    invitationId: number;
    mode: GameMode;
}

export interface WsTournamentSession {
    id?: string;
    hostId?: number;
    players?: number[];
    maxPlayers?: number;
    stateT?: "inviting" | "ready" | "started" | "finished";
}

export interface WsTournamentInvOut {
    sentById: number;
    sentByUsername: string;
    InviteId: number;
}

export interface WsInvitationIn {
    sentTo?: number;
    mode: GameMode;
}

export type Competitor = {
    name: string;
    Me?: boolean | null;
    avatar?: string;
    id?: number;
}

export interface KeyAction {
    key: string;
    matchId: number;
}


export interface GamePauseInfo {
    startTime: number;
    duration: number;
    isSelfPaused?: boolean;
};

export interface GameEndInfo {
    normalEnd: boolean;
    details: {
        winner: boolean;
        message: string;
    };
}
// client -> server (what is received from the client)
export interface ChatMsg {
    profileUrl: string;
    receiverName: string;
    receiverId: number;
    text: string;
    senderName: string;
    senderId: number;
    room_id: number;
}
export interface XOPlayer {
    id: number;
    username: string;
    avatar_url: string;
    game_state: "idle" | "in_game";
    is_online: boolean;
	role: 'X' | 'O';
}

export type XOPlayers = Record<'X' | 'O', XOPlayer | null>;

export interface WsDataIn {
    type: EventIn;
    data: {
        keyAction?: KeyAction;
        blockUser?: {
            blocker: number;
            toBlock: number;
        };
        modGameInfo?: {
            matchId: number;
        };
        chatMsg?: ChatMsg;
        players?: XOPlayers;
        leaver?: XOPlayer;
    }
};

export interface FriendRequest {
    id: number;
    requester_id: number;
    username: string;
    avatar_url: string;
}

export interface XOMatchChange {
    winner: XOPlayer | null;
    nextTurn: "X" | "O" | null;
    board: XOBoard;
}

export interface WsDataOut {
    type: EventOut;
    socketId?: number;
    wsInvitation?: WsInvitationOut;
    wsTInvitation?: WsTournamentInvOut;
    wsInvitationReject?: WsInvitationReject;
    wsInvitationAccept?: UserSharableInfo;
    wsTn_data?: Competitor;
    friendRequest?: FriendRequest;
    gameStartInfo?: GameStartInfo;
    gameState?: GameState;
    gamePauseInfo?: GamePauseInfo;
    gameEndInfo?: GameEndInfo;
    id?: number;
    blocker?: number;
    blocked?: number;
    score?: GameScoreInfo;
    friendInfo?: UserSharableInfo;
    chatMsg?: ChatMsg;
    winner?: XOPlayer;
    xoMatch?: XOMatchChange;
    xoGameStartInfo?: {
        players: XOPlayers;
        role: "X" | "O" | null;
    }
}

export type WsEntry = {
  id: number;
  ws: WebSocket;
};

export class WebsocketService {
    private static wsConnections = new Map<number, WsEntry[]>();
    private static wsIdMap = new Map<number, WsEntry>();
    private static wsToId = new Map<WebSocket, number>();
    private static nextConnId = 1;

    static registerWs(userId: number, ws: WebSocket): number {
        const wsId = this.nextConnId++;
        const entry: WsEntry = { id: wsId, ws };

        // Add to user mapping
        const existing = this.wsConnections.get(userId) ?? [];
        existing.push(entry);
        this.wsConnections.set(userId, existing);

        // Add to lookup maps
        this.wsIdMap.set(wsId, entry);
        this.wsToId.set(ws, wsId);

        return wsId;
    }

    static removeWs(userId: number, ws: WebSocket) {
        const existing = this.wsConnections.get(userId);
        if (!existing) return;

        const filtered = existing.filter(e => {
            if (e.ws === ws) {
                this.wsIdMap.delete(e.id);
                this.wsToId.delete(e.ws);
                return false;
            }
            return true;
        });

        if (filtered.length > 0) this.wsConnections.set(userId, filtered);
        else this.wsConnections.delete(userId);
    }

    static removeWsById(userId: number, wsId: number) {
        const existing = this.wsConnections.get(userId);
        if (!existing) return;

        for (const e of existing) {
            if (e.id === wsId) {
                this.wsToId.delete(e.ws);
                break;
            }
        }

        const filtered = existing.filter(e => e.id !== wsId);
        this.wsIdMap.delete(wsId);

        if (filtered.length > 0) this.wsConnections.set(userId, filtered);
        else this.wsConnections.delete(userId);
    }
    static findWsById(wsId: number): WsEntry | undefined {
        return this.wsIdMap.get(wsId);
    }

    static findIdByWs(ws: WebSocket): number | undefined {
        return this.wsToId.get(ws);
    }

    static sendToId(wsId: number, data: WsDataOut): boolean {
        const entry = this.wsIdMap.get(wsId);
        if (!entry) return false;

        if (entry.ws.readyState === entry.ws.OPEN) {
            entry.ws.send(JSON.stringify({ success: true, details: data }));
            return true;
        }

        return false;
    }

    static hasWs(userId: number, wsId: number): boolean {
        const entries = this.wsConnections.get(userId);
        if (!entries) return false;

        return entries.some(e => e.id === wsId);
    }

    static isWsAlive(wsId: number): boolean {
        const entry = this.wsIdMap.get(wsId);
        return !!entry && entry.ws.readyState === entry.ws.OPEN;
    }

    static getWs(userId: number): WsEntry[] | undefined {
        return this.wsConnections.get(userId);
    }

    static getAllWs(): Map<number, WsEntry[]> {
        return this.wsConnections;
    }

    static getConnCount(userId: number): number {
        return this.wsConnections.get(userId)?.length ?? 0;
    }
}
