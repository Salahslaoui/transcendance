import  fastify, { FastifyInstance } from "fastify";
import { WebSocket, RawData } from "ws";
import UserModel from "../../database/user/user.db";
import { checkIfFriends } from "../../database/relationships/friends.db";
import { User, WebsocketService, WsEntry } from "../../helpers/wsUtils";
import { WsDataIn, WsDataOut, KeyAction } from "../../helpers/wsUtils";
import { MatchManager } from "../../game-logic/match.logic";
import { getSuccessMsg } from "../../helpers/utils";
import fN from "../../init";
import { XOGlobalLobby } from "../tic-tac-toe/lobby-queue";
import { BroadcastNewLobby, getLobbyUsers } from "../tic-tac-toe/xogame";
import { XOGameManager, XOGameSession } from "../tic-tac-toe/game-service";
import getDB from "../../database/db";
import { addXp } from "../user/level/level";

async function broadcastToFriends
    (userId: number,
    toSend: WsDataOut) {
        const wsConnections = WebsocketService.getAllWs();
        for (const [otherId, entries] of wsConnections) {
            if (await checkIfFriends(userId, otherId)) {
                for (const entry of entries) {
                    const ws = entry.ws;
                    if (ws && ws.readyState == WebSocket.OPEN)
                        ws.send(JSON.stringify({success: true, details: toSend}));
                }
            }
        }
}

async function handleKeyAction(playerId: number, keyAction: KeyAction, action: "up" | "down", socketId: number) {
    const match = MatchManager.currentMatches[keyAction.matchId];
    if (!match)
        throw new Error("Match not found");
    match.manageAction(playerId, keyAction.key, action, socketId);
}

async function handleXOGameLeave(leaverId: number) {
    const game: XOGameSession | undefined = XOGameManager.getGameByPlayerId(leaverId);
    try {
        if (game){
            const winner = leaverId === game.player1.id ? game.player2 : game.player1;
            await XOGameManager.removeGame(game);
            const winnerUser = await UserModel.findByField("id", winner.id);
            if (winnerUser)
                await winnerUser.sendViaWs({type: "xo_game_end", winner: winner});
            const leaverUser = await UserModel.findByField("id", leaverId);
            if (leaverUser)
                await leaverUser.sendViaWs({type: "xo_game_end", winner: winner});
            const db = await getDB();
            await db.run(
                'INSERT INTO match (player1_id, player2_id, game_type, score_player1, score_player2, winner_id, mode, tournament_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [leaverId, winner.id, "tic_tac_toe", 0, 1, winner.id, "1v1", null]
            );
            if (winner)
                await addXp(winner.id);
        }
    }
    catch(e) {console.error(`Error handling leave for player ${leaverId}:`, e);};
}

async function handleWsMessage(id: number, packet: RawData, socketId: number, connection: WebSocket) {
    try {
            const data = JSON.parse(packet.toString()) as WsDataIn;
            switch (data.type) {
                case "key_down":
                    const keyDataDown = data.data.keyAction;
                    if (!keyDataDown)
                        return;
                    await handleKeyAction(id, keyDataDown as KeyAction, "down", socketId);
                    break;
                case "key_up":
                    const keyDataUp = data.data.keyAction;
                    if (!keyDataUp)
                        return;
                    await handleKeyAction(id, keyDataUp as KeyAction, "up", socketId);
                    break;
                case "control_game":
                    const ctId = data.data.modGameInfo?.matchId;
                    if (!ctId)
                        return;
                    MatchManager.takeControl(id, ctId, socketId);
                    break;
                case "pause_game":
                    const pId = data.data.modGameInfo?.matchId;
                    if (!pId)
                        return;
                    MatchManager.pauseMatch(id, pId, socketId);
                    break;
                case "continue_game":
                    const cnId = data.data.modGameInfo?.matchId;
                    if (!cnId)
                        return;
                    MatchManager.continueMatch(id, cnId, socketId);
                    break;
                case "end_game":
                    const mId = data.data.modGameInfo?.matchId;
                    if (!mId)
                        return;
                    await MatchManager.endGameByRequest(id, mId, socketId);
                    break;
            }
        } catch (error) {
            if (error instanceof Error)
                connection.send(JSON.stringify({success: false, error: error.message}));
            else
                connection.send(JSON.stringify({success: false, error: "Invalid JSON"}));
        }
}


async function handleWsDisconnect(id: number, connection: WebSocket, reason: "error" | "close") {
    const wsId = WebsocketService.findIdByWs(connection);
    WebsocketService.removeWs(id, connection);
    reason == "close" && connection.close(1011, "Internal server error");
    if (WebsocketService.getConnCount(id) == 0) {
        await broadcastToFriends(id, {type: "friend_disconnect", id});
        MatchManager.cleanUpPlayer(id);
        const user = await UserModel.findByField("id", id);
        if (user) {
            user.game_state = "idle";
            user.save();
        }
    } else
        MatchManager.promoteIfPaused(id, wsId!);
}


function sendSocketId(connection: WebSocket, socketId: number) {
    const data: WsDataOut = {type: "socket_register", socketId};
    connection.send(JSON.stringify(getSuccessMsg(data)));
}

async function removeFromXOLobby(user_id: number) {
    if (XOGlobalLobby.delete(user_id)){
        const lobbyPlayersData = await getLobbyUsers();
		BroadcastNewLobby(lobbyPlayersData);
    }
}

export default function WebsocketRoutes(fastify: FastifyInstance) {
    fastify.get("/init",
        {websocket: true, preHandler: fastify.authenticate({allowApi: true, ws: true})},
        async (connection, req) =>{
            const {id} = req.user;
            const socketId = WebsocketService.registerWs(id, connection);
            sendSocketId(connection, socketId);
            if (WebsocketService.getConnCount(id) == 1)
                broadcastToFriends(id, {type: "friend_connect", id});

            connection.on("message", async (packet) => {
                await handleWsMessage(id, packet, socketId , connection);
            });

            connection.on("error", async (err) => {
                await handleWsDisconnect(id, connection, "error");
                await removeFromXOLobby(id);
                await handleXOGameLeave(id);
            });

            connection.on("close", async () => {
                await handleWsDisconnect(id, connection, "close");
                await removeFromXOLobby(id);
                await handleXOGameLeave(id);
            });
    });
}
