import getDB from "../../database/db";
import UserModel from "../../database/user/user.db";
import { XOMatchChange, XOPlayer, XOPlayers } from "../../helpers/wsUtils";
import { addXp } from "../user/level/level";

type XOCell = 'X' | 'O' | null;

export type XOBoard = [
    XOCell, XOCell, XOCell,
    XOCell, XOCell, XOCell,
    XOCell, XOCell, XOCell
  ];

export interface XOGameSession {
    gameId: number;
    player1: XOPlayer;
    player2: XOPlayer;
    board: XOBoard;
    role: XOCell;
    roleTimer?: NodeJS.Timeout;
}

export class GameError extends Error {
    constructor(public message: string, public code: string) {
        super(message);
        this.name = "GameError";
    }
}

export abstract class XOGameManager {
    private static activeGames: Map<number ,XOGameSession> = new Map<number, XOGameSession>();
	private static LastGameId: number = 0;
    private static winningCombinations = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8],
		[0, 3, 6], [1, 4, 7], [2, 5, 8],
		[0, 4, 8], [2, 4, 6]
	];
    private static TURN_LIMIT = 15000;
    static async createGame(p1: XOPlayer, p2: XOPlayer): Promise<XOGameSession> {
        for (const game of this.activeGames.values()) {
            const isMatch = (game.player1.id === p1.id && game.player2.id === p2.id) || (game.player1.id === p2.id && game.player2.id === p1.id);
            if (isMatch)
                return game;
        }
        const user1 = await UserModel.findByField("id", p1.id);
        const user2 = await UserModel.findByField("id", p2.id);
        if (user1 && user2 && (user1.game_state === "in_game" || user2.game_state === "in_game"))
            throw Error("User is already in a game!");
        const gameId = ++this.LastGameId;
        const newGame: XOGameSession = {
            gameId,
            player1: p1,
            player2: p2,
            board: [
                null, null, null,
                null, null, null,
                null, null, null
            ],
            role: Math.random() < 0.5 ? 'X' : 'O',
        };
        const db = await getDB();
        await db.run("UPDATE users SET game_state = 'in_game' WHERE id = ?;", [p1.id]);
        await db.run("UPDATE users SET game_state = 'in_game' WHERE id = ?;", [p2.id]);
        this.activeGames.set(gameId, newGame);
        newGame.roleTimer = setTimeout(async () => await this.onTimeOutCall(newGame), this.TURN_LIMIT);
        return newGame;
    }

    static getGameByPlayerId(playerId: number): XOGameSession | undefined {
        for (const game of this.activeGames.values())
            if (game.player1.id === playerId || game.player2.id === playerId)
                return game;
        return undefined;
    }

    static async removeGame(game: XOGameSession) {
        const player1: XOPlayer = game.player1;
        const player2: XOPlayer = game.player2;
        if (game.roleTimer)
            clearTimeout(game.roleTimer);
        this.activeGames.delete(game.gameId);
        const user1 = await UserModel.findByField("id", player1.id);
        const user2 = await UserModel.findByField("id", player2.id);
        const db = await getDB();
        if (user1){
            await db.run("UPDATE users SET game_state = 'idle' WHERE id = ?;", [player1.id]);
        }
        if (user2){
            await db.run("UPDATE users SET game_state = 'idle' WHERE id = ?;", [player2.id]);
        }
    }

    static boardUpdate(game: XOGameSession, index: number, currentPlayer: number): { winner: XOPlayer | null, nextTurn: XOCell, board: XOBoard } {
        if (!game)
            throw Error("No such game!");
        const players: XOPlayers = {'X': null, 'O': null};
        players[game.player1.role] = game.player1;
        players[game.player2.role] = game.player2;
        const moveMaker: XOPlayer | null = players["X"]!.id === currentPlayer ? players["X"] : players["O"];
        if (moveMaker?.role !== game.role)
            throw new GameError('Invalid action: not your turn!', 'NOT_YOUR_TURN');
        if (index >= 0 && index < 9 && game.board[index] === null)
            game.board[index] = game.role;
        else
            throw new GameError('Invalid action: cell is not empty!', 'INVALID_MOVE');
        for (const [a, b, c] of XOGameManager.winningCombinations) {
            if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                const winner = players[game.board[a]!];
                if (game.roleTimer) clearTimeout(game.roleTimer);
                return { winner, nextTurn: null, board: game.board};
            }
        }
        const isFull = game.board.every((cell) => cell !== null);
        if (isFull){
            if (game.roleTimer) clearTimeout(game.roleTimer);
            return { winner: null, nextTurn: null, board: game.board}; // if nextTurn && winner null -> draw
        }
        game.role = game.role === "X" ? "O" : "X";
        this.resetRoleTimer(game);
        return { winner: null, nextTurn: game.role, board: game.board};
    }

    private static async onTimeOutCall(game: XOGameSession) {
        try {
            if (!game)
                throw Error("No such game!");
            const players: XOPlayers = {'X': null, 'O': null};
            players[game.player1.role] = game.player1;
            players[game.player2.role] = game.player2;
            const user1 = await UserModel.findByField("id", players["X"]!.id);
            const user2 = await UserModel.findByField("id", players["O"]!.id);
            const winner: XOCell = game.role === "X" ? "O" : "X";
            const result: XOMatchChange = { winner: players[winner], nextTurn: null, board: game.board};
            if (user1) await user1.sendViaWs({type: "xo_board_change", xoMatch: result});
            if (user2) await user2.sendViaWs({type: "xo_board_change", xoMatch: result});
            await this.removeGame(game);
            const scoreP1 = players[winner]!.id === game.player1.id ? 1 : 0;
            const scoreP2 = players[winner]!.id === game.player2.id ? 1 : 0;
            const db = await getDB();
            await db.run(
                'INSERT INTO match (player1_id, player2_id, game_type, score_player1, score_player2, winner_id, mode, tournament_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [game.player1.id, game.player2.id, "tic_tac_toe", scoreP1, scoreP2, players[winner]!.id, "1v1", null]
            );
            const winnerPlayer = players[winner];
            if (winnerPlayer && winnerPlayer.id) {
                await addXp(winnerPlayer.id);
            }
        }
        catch(e) {}
    }

    private static resetRoleTimer(game: XOGameSession) {
        clearTimeout(game.roleTimer);
        game.roleTimer = setTimeout(async () => {
            await this.onTimeOutCall(game)
        }, this.TURN_LIMIT);
    }
}
