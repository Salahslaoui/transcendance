import { Competitor } from "@/components/Tournament/Round";
import { Dispatch, SetStateAction } from "react";


export type MatchState = "init" | "running" | "normal_pause_left" | "normal_pause_right" | "waiting_for_left" | "waiting_for_right" | "finished";

export interface SecurityCheck {
	setError: (error: string | null) => void;
	setSuccess: (success: string | null) => void;
}

export type User = {
  id: number;
  username: string;
  avatar_url: string;
  game_state: "idle" | "in_game";
  is_online: boolean;
  is_two_fa_enabled?: boolean;
  blocker_id?: number | null; // optional-blocker_id
}

export type PlayerGameState = {
    matchState: MatchState;
    matchId: number;
    vsPlayer: User;
    myScore: number;
    vsPlayerScore: number;
    myDirection: "left" | "right";
    additionalInfo?: {
        remainingPause?: number;
    }
}

export type TournamentInfo = {
    id: string;
    hostId: number;
    players: number[];
    maxPlayers: number;
    stateT: "inviting" | "ready" | "started" | "finished"; 
}

export type ReceivedData = {
    success: boolean;
    error?: string;
    details?: {
        id?: number;
        friends?: User[];
        Competitors?: Competitor[];
        user?: User;
        isMatchMaking: boolean;
        users?: User[];
        state?: PlayerGameState | null;
        tournamentInfo?: TournamentInfo;
        Scores?: string[];
        stateT?: "inviting" | "ready" | "started" | "finished";
    }
    details2?: {}
}

export type FriendsProps = {
  friends: Set<User>;
  setFriends: Dispatch<SetStateAction<Set<User>>>;
};

