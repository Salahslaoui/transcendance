import fastify, { FastifyInstance } from "fastify";
import { User, WebsocketService, XOPlayer, XOPlayers } from "../../helpers/wsUtils";
import { XOGlobalLobby } from "./lobby-queue";
import getDB from "../../database/db";
import UserModel, { UserSharableInfo } from "../../database/user/user.db";
import { Friendship } from "../../database/relationships/friends.db";
import { GameError, XOGameManager, XOGameSession } from "./game-service";
import { addXp } from "../user/level/level";
import {WebSocket} from "ws";
import MatchMaking from "../../game-logic/matchmaking.logic";

const boardSchema = {
	body: {
		type: "object",
		properties: {
			index: {
				type: "integer",
				minimum: 0,
				maximum: 8
			}
		},
		required: ["index"]
	}
};

export const finishGame = async (myId: number, game: XOGameSession) => {
	await XOGameManager.removeGame(game);
	const opponent: XOPlayer = game.player1.id === myId ? game.player2 : game.player1;
	try {
		const opponentUser = await UserModel.findByField("id", opponent.id);
		const otherUser = await UserModel.findByField("id", opponent.id === game.player1.id ? game.player2.id : game.player1.id);
		if (opponentUser)
			await opponentUser.sendViaWs({type: "xo_game_end", winner: opponent});
		if (otherUser)
			await otherUser.sendViaWs({type: "xo_game_end", winner: opponent});
		const db = await getDB();
		await db.run('INSERT INTO match ( player1_id, player2_id, game_type, score_player1, score_player2, winner_id, mode, tournament_id ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[myId, opponent.id, "tic_tac_toe", 0, 1, opponent.id, "1v1", null]);

		if(opponent)
			await addXp(opponent.id);
	}
	catch(e) {}
}

export async function getLobbyUsers() : Promise<UserSharableInfo[]>{
	const currentLobbyUids: number[] = Array.from(XOGlobalLobby.keys());
	let lobbyPlayersData: UserSharableInfo[];
	if (currentLobbyUids.length === 0)
		lobbyPlayersData = [];
	else {
		const tasks = currentLobbyUids.map(async (uid) => {
			const user = await UserModel.findByField("id", uid);
			return user ? user.getSharableInfo() : null;
		});
		const results = await Promise.all(tasks);
		lobbyPlayersData = results.filter(player => player !== null) as UserSharableInfo[];
	}
	return lobbyPlayersData;
}

export function BroadcastNewLobby(data: UserSharableInfo[]) {
	for (const [id, conns] of XOGlobalLobby) {
		for (const entry of conns) {
			if (entry.ws.readyState === WebSocket.OPEN) {
				entry.ws.send(JSON.stringify({
					success: true,
					details: {
						type: "xo_lobby_update",
						players: data,
					}
				}));
			}
		}
	}
}

const userToXOPlayer = (user: UserSharableInfo, role: "X" | "O"): XOPlayer => {
	const player: XOPlayer = {
		id: user.id,
		username: user.username,
		avatar_url: user.avatar_url,
		game_state: user.game_state,
		is_online: user.is_online,
		role: role,
	};
	return player;
}

export default async function lobbyRoutes(app: FastifyInstance) {
	app.post("/xo/lobby/join", { preHandler: app.authenticate(),}, async (request, response) => {
		const user = request.user as any;
		const userId = Number(user.id);

		if (XOGlobalLobby.has(userId) || MatchMaking.isInPool(userId)){
			return response.code(400).send({
				success: false,
				error: "Player already looking for opponent"
			});
		}

		const userData = await UserModel.findByField("id", userId);

		if (!userData) {
			return response.code(401).send({
				success: false,
				error: "User not found"
		});
		}

		if (userData.game_state === "in_game")
			return response.code(400).send({
				success: false,
				error: "Player already in a game"
		});


		const activeConnections = WebsocketService.getWs(userId);
		if (!activeConnections || activeConnections.length === 0) {
			return response.code(400).send({
				success: false,
				error: "No active socket connection found. Connect via WS first."
			});
		}
		XOGlobalLobby.set(userId, activeConnections);

		const lobbyPlayersData = await getLobbyUsers();

		BroadcastNewLobby(lobbyPlayersData);

		return { success: true, new: userId };
	});

	app.post("/xo/lobby/leave", { preHandler: app.authenticate(),}, async (request, response) => {
		const userId = Number(request.user.id);
		const userNode = XOGlobalLobby.get(userId);
		if (userNode && userNode.length > 1) // which means another tab is opened, don't remove this user node, instead leave, then this node will still be there when checked in /join, which will throw a exception if existed
			return;
		XOGlobalLobby.delete(userId);
		const game = XOGameManager.getGameByPlayerId(userId);
		if (game) await finishGame(userId, game);
		const lobbyPlayersData = await getLobbyUsers();

		BroadcastNewLobby(lobbyPlayersData);

		return { success: true, left: userId };
	});

	app.post<{ Body: { index: number } }>("/xo/game/board", { preHandler: app.authenticate(), schema: boardSchema }, async (request, response) => {
		const userId = Number(request.user.id);
		const { index } = request.body;
		const game = XOGameManager.getGameByPlayerId(userId);

		if (!game)
			return response.code(404).send({
				success: false,
				error: "No active game found for this player."
			});
		try {
			const result = XOGameManager.boardUpdate(game, index, userId);
			const opponent: XOPlayer = game.player1.id === userId ? game.player2 : game.player1;
			const opponentUser = await UserModel.findByField("id", opponent.id);
			if (result.winner || result.nextTurn === null) {
				await XOGameManager.removeGame(game);
				const winnerId = result.winner ? result.winner.id : null;
				const db = await getDB();
				await db.run(
					'INSERT INTO match (player1_id, player2_id, game_type, score_player1, score_player2, winner_id, mode, tournament_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
					[userId, opponent.id, "tic_tac_toe", 0, 1, winnerId, "1v1", null]
				);
				if (winnerId)
					await addXp(winnerId);
			}
			if (opponentUser)
				await opponentUser.sendViaWs({type: "xo_board_change", xoMatch: result});
			return response.send({ success: true, ...result });
		}
		catch (e) {
			const isGameError = e instanceof GameError;
			return response.code(400).send({
				success: false,
				error: isGameError ? e.message : "Unknown error",
				code: isGameError ? e.code : "GENERIC_ERROR"
			});
		}
	});

	app.get("/xo/lobby/vs", { preHandler: app.authenticate() }, async (request, response) => {
		const userId = Number(request.user.id);
		let opponentId: number | undefined;
		let opponentConns: any;
		for (const id of XOGlobalLobby.keys()) {
			if (id !== userId) {
				opponentConns = XOGlobalLobby.get(id);
				if (XOGlobalLobby.delete(id) ) {
					opponentId = id;
					break;
				}
			}
		}
		if (!opponentId || !opponentConns)
			return response.code(404).send({ success: false, reason: 'Not enough players' });

		try {
			const db = await getDB();
			const user = await UserModel.findByField("id", opponentId);
			if (!user || !user.isOnline()) {
				return response.code(400).send({
					success: false,
					opponent: null,
					reason: "Matchmaking failed: User is offline or invalid"
				});
			}
			const friendship = await db.get<Friendship>(
				'SELECT blocker_id FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
				[userId, opponentId, opponentId, userId]
			);
			if (friendship && friendship.blocker_id !== null)
				throw new Error("Match blocked");
			if (!XOGlobalLobby.delete(userId))
				throw new Error("You were challenged by someone else!");
			const lobbyUsers = await getLobbyUsers();
			BroadcastNewLobby(lobbyUsers);

			const opponent = user.getSharableInfo();
			const me = await UserModel.findByField("id", userId);
			if (!me)
				return response.code(400).send({
					success: false,
					opponent: null,
					reason: "User not found!"
				});
			const meUser = me.getSharableInfo();
			const playerX: XOPlayer = userToXOPlayer(opponent, "X");
			const playerO: XOPlayer = userToXOPlayer(meUser, "O");
			const gamePlayers: XOPlayers =  {"X": playerX, "O": playerO}
			const newGame: XOGameSession = await XOGameManager.createGame(playerX, playerO);
			await user.sendViaWs({type: "xo_game_start", xoGameStartInfo: {players: gamePlayers, role: newGame.role}});
			return { success: true, players: gamePlayers, role: newGame.role };

		} catch (error) {
			XOGlobalLobby.set(opponentId, opponentConns);
			return response.code(400).send({ success: false, opponent: null, reason: error instanceof Error ? error.message : "Match validation failed"});
		}
	});

}
