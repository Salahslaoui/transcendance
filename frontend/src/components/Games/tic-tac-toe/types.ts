import { User } from "@/helpers/types";
import { Dispatch, SetStateAction } from "react";
import { LaunchedGame } from "../games";

export interface GameProfileListProps{
	user: User,
}

export interface TicTacToeProps {
	setLaunchedGame: Dispatch<SetStateAction<LaunchedGame | null>>;
}


export interface GameBoardInterface {
	board: Player[],
	winner: Winner,
	winningCombinations: number[][],
	handleClick: (index: number) => Promise<void>
	gameMode: GameMode,
}

export type Player = 'X' | 'O' | null;
export type Winner = Player | 'Draw';
export type GameMode = 'matchmake' | null;

export interface XOPlayer extends User {
	role: 'X' | 'O';
}

export interface PlayerCardProps {
	player: XOPlayer;
	isActive: boolean;
	isWinner: boolean;
}

export interface MatchDashBoardProps {
	players: XOPlayers,
	setGameMode: React.Dispatch<React.SetStateAction<GameMode>>,
	setRemoteMode: React.Dispatch<React.SetStateAction<GameMode>>,
	setPlayers: React.Dispatch<React.SetStateAction<XOPlayers>>,
	winner: Winner,
	nextPlayer: "X" | "O" | null,
	resetGame: () => void,
	setNextPlayer: React.Dispatch<React.SetStateAction<"X" | "O" | null>>,
}


export type XOPlayers = Record<'X' | 'O', XOPlayer | null>;
