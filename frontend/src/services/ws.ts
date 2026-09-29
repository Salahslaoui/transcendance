
"use client";

import { Players } from "@/components/Games/games";
import { Player } from "@/components/ui/player-modal";

import { User } from "@/helpers/types";

export enum WebSocketState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
    NONE = 4
};

type Callback = (data: any) => void;

type GameEvents = "game_event" | "game_score" | "game_pause" | "game_ask_control" | "game_continue" | "game_end";

export type Event = "socket_register" | "matchmaking_start" | "matchmaking_end" | "invitation_delivery" | "game_start" | GameEvents | "friend_connect" | "online_friends" | "friend_disconnect" | "arrived_message" | "self_message" | "user_blocked" | "user_unblocked" | "self_user_blocked" | "self_user_unblocked" | "friend_request" | "friend_add" | "friend_removed" | "TournInviteSent" | "TournInviteReject" | "TournInviteAccept" | "Tn_start" |"xo_lobby_update" | "xo_game_start" | "xo_game_end" | "xo_board_change";

type GameMode = "tournament" | "1v1";

  type Vector = {
    x: number;
    y: number;
  };

type PaddleObj = {
    left: number;
    right: number;
  }


export type Competitor = {
    name: string;
    Me?: boolean | null;
    avatar?: string;
    id?: number;
}

interface GameStartInfo {
    against: User;
    mode: GameMode;
    myDirection: "left" | "right";
    isControl: boolean;
    matchId: number;
}

type GameState = {
    ballPos: Vector;
    paddlesPos: PaddleObj;
}

interface WsInvitationIn {
    sentById: number;
    sentByUsername: string;
    invitationId: number;
    mode: GameMode;
}

export interface WsTournamentInvIn {
    sentById: number;
    sentByUsername: string;
    InviteId: number;
}

export interface WsInvitationReject {
    rejectedById: number;
    rejectedByUsername: string;
    invitationId: number;
}

export interface WsTournamentSession {
    id?: string;
    hostId?: number;
    players?: number[];
    maxPlayers?: number;
    state?: "inviting" | "ready" | "started" | "finished";
}

export interface GameEndInfo {
    normalEnd: boolean;
    details: {
        winner: boolean;
        message: string;
    };
}

export interface GameScoreInfo {
    leftScore: number;
    rightScore: number;
}

export interface GamePauseInfo {
    startTime: number;
    duration: number;
    isSelfPaused: boolean;
};

export interface ChatMsg {
    profileUrl: string;
    receiverName: string;
    receiverId: number;
    text: string;
    senderName: string;
    senderId: number;
    room_id: number;
}

interface XOPlayer {
    id: number;
    username: string;
    avatar_url: string;
    game_state: "idle" | "in_game";
    is_online: boolean;
	role: 'X' | 'O';
}

type XOPlayers = Record<'X' | 'O', XOPlayer | null>;

type XOCell = 'X' | 'O' | null;

type XOBoard = [
    XOCell, XOCell, XOCell,
    XOCell, XOCell, XOCell,
    XOCell, XOCell, XOCell
  ];

export interface XOMatchChange {
    winner: XOPlayer | null;
    nextTurn: "X" | "O" | null;
    board: XOBoard;
}

// server -> client
export interface WsDataIn {
    success: boolean;
    details: {
        type: Event;
        socketId?: number;
        wsInvitation?: WsInvitationIn;
        wsTInvitation?: WsTournamentInvIn;
        wsInvitationReject?: WsInvitationReject;
        wsInvitationAccept?: User;
        wsTn_data?: Competitor;
        gameStartInfo?: GameStartInfo;
        gamePauseInfo?: GamePauseInfo;
        gameState?: GameState;
        score?: GameScoreInfo;
        gameEndInfo?: GameEndInfo;
        friends?: User[];
        id?: number;
        friendRequest?: User;
        friendInfo?: User;
        chatMsg?: ChatMsg;
        blocker?: number;
        blocked?: number;
        players?: XOPlayers;
        winner?: XOPlayer;
        xoMatch?: XOMatchChange;
        xoGameStartInfo?: {
            players: XOPlayers;
            role: "X" | "O" | null;
        }
    }
}

class WebsocketService {
    private static socket: WebSocket | null = null;
    private static callbacks: Partial<Record<Event, Set<Callback>>> = {};
    private static token: string | null = null;

    constructor() {
        throw new Error("WebsocketService is a static class, it can only be initiated using the init function");
    }


    static connect() {
        if (this.socket) return;

        if (!this.token)
            throw new Error("Set a token before trying to connect");

        this.socket = new WebSocket(
            process.env.NODE_ENV === "production"
              ? `wss://${window.location.host}/api/ws/init?token=${this.token}`
              : `ws://localhost:8000/api/ws/init?token=${this.token}`
          );
        this.socket.onopen = null;


        this.socket.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data) as WsDataIn;
            const type = data.details.type;
            if (!this.callbacks[type]) {
                return;
            }
            const cbs = this.callbacks[type];
            cbs.forEach(cb => cb(data));
        }

        this.socket.onclose = () => {
            this.socket = null;
        }

        this.socket.onerror = (err) => {
            if (this.socket) {
                this.socket.close();
            }
        }
    }


    static subscribe(event: Event, callback: Callback) {
        if (!this.callbacks[event]) this.callbacks[event] = new Set();
        this.callbacks[event].add(callback);
    }


    static setToken(token: string) {
        this.token = token;
    }

    static getState(): WebSocketState {
        if (!this.socket)
            return WebSocketState.NONE;
        return this.socket.readyState;
    }

    static unsubscribe(event: Event, callback?: Callback) {
        if (!this.callbacks[event])
            return;
        if (!callback) {
            this.callbacks[event].clear();
            return;
        }
        this.callbacks[event].delete(callback);
    }


    static send(type: string, data: object) {
        if (!this.socket)
            throw new Error("Tryign to use null socket");
        this.socket.send(JSON.stringify({type, data}));
    }


    static reset() {
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            this.socket = null;
        }
        this.callbacks = {};
        this.token = null;
    }
}

export default WebsocketService;
