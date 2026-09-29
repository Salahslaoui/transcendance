import { FastifyInstance } from "fastify";
import { sendInviteSchema, manageInviteSchema, manageInviteSchemaBody } from "../../../schemas/invite.schema";
import { checkIfFriends } from "../../../database/relationships/friends.db";
import UserModel from "../../../database/user/user.db";
import { InvitationRedisModel } from "../../../redis/redis";
import { WebsocketService, WsInvitationOut } from "../../../helpers/wsUtils";
import { GameMode } from "../../../helpers/wsUtils";
import { StatusCodes } from "http-status-codes";
import { getSuccessMsg } from "../../../helpers/utils";
import MatchModel from "../../../database/game/match.db";
import { MatchManager } from "../../../game-logic/match.logic";
import MatchMaking from "../../../game-logic/matchmaking.logic";

type InviteBody = {
    invitedId: number;
    mode: GameMode;
    socketId: number;
}


type ManageParams = {
    action: "accept" | "reject";
    invitationId: number;
}


interface SavedInvitation extends WsInvitationOut {
    senderId: number;
}

export default function InviteRoutes(fastify: FastifyInstance) {
    fastify.post<{Body: InviteBody}>("/send", {schema: {body: sendInviteSchema},
        preHandler: fastify.authenticate({allowApi: true})}, async (req, res) => {
        const {id} = req.user;
        const {invitedId, mode, socketId} = req.body;
        if (!WebsocketService.hasWs(id, socketId))
            throw fastify.httpErrors.unauthorized("Invalid socketId");
        const user = await UserModel.findByField("id", id);
        if (!user)
            throw fastify.httpErrors.unauthorized("You are not a valid user");
        if (user.game_state !== "idle" || MatchMaking.isInPool(id))
            throw fastify.httpErrors.conflict("You are already in a game or in matchmaking pool");
        const friend = await UserModel.findByField("id", invitedId);
        if (!friend || !await checkIfFriends(id, invitedId))
            throw fastify.httpErrors.forbidden("You can only invite your friends");
        if (!friend.isOnline())
            throw fastify.httpErrors.badRequest("You can't send an invitation to an offline friend");
         if (friend.game_state !== "idle" || MatchMaking.isInPool(friend.getId()))
            throw fastify.httpErrors.conflict("User already in game");
        const inviteId = await InvitationRedisModel.incr();
        const invitationData: WsInvitationOut = {invitationId: inviteId, sentById: user.getId(), sentByUsername: user.username ,mode: mode} ;
        await InvitationRedisModel.set(inviteId, {...invitationData, senderId: socketId});
        friend.sendViaWs({type: "invitation_delivery", wsInvitation: invitationData});
        res.code(StatusCodes.OK).send(getSuccessMsg({message: "Invitation sent successfully"}));
    })

    fastify.post<{Params: ManageParams, Body: {socketId: number}}>("/:action/:invitationId",
        {schema: {params: manageInviteSchema, body: manageInviteSchemaBody}, preHandler: fastify.authenticate({allowApi: true})}, async (req, res) => {
        const {id} = req.user;
        const {action, invitationId} = req.params;
        const {socketId} = req.body;
        const invitation = await InvitationRedisModel.get<SavedInvitation>(invitationId);
        if (!invitation)
            throw fastify.httpErrors.notFound("Invitation not found or expired");
        await InvitationRedisModel.delete(invitationId);
        if (!await checkIfFriends(id, invitation.sentById)) // Unfriend or block after invite!
            throw fastify.httpErrors.conflict("You can only accept invitations from your friends");

        const user = await UserModel.findByField("id", id);
        if (!user)
            throw fastify.httpErrors.unauthorized("You are not a valid user");
        const friend = await UserModel.findByField("id", invitation.sentById);
        if (!friend)
            throw fastify.httpErrors.notFound("Couldn't find user who sent the request"); // ????
        switch (action) {
            case "accept":
                if (!friend.isOnline())
                    throw fastify.httpErrors.conflict("This user is currently offline");
                if (user.game_state !== "idle" || MatchMaking.isInPool(id))
                    throw fastify.httpErrors.conflict("You are already in a game");
                if (friend.game_state !== "idle" || MatchMaking.isInPool(friend.getId()))
                    throw fastify.httpErrors.conflict("This user is already in a game");
                friend.game_state = "in_game";
                await friend.save();
                user.game_state = "in_game";
                await user.save();
                const match = await MatchModel.create({player1_id: user.getId(), player2_id: friend.getId(), mode: invitation.mode, game_type: "ping_pong"});
                const matchManager = new MatchManager(match, user, friend, invitation.mode, socketId, invitation.senderId);
                await matchManager.start();
                break;
            case "reject":
                friend.sendViaWs({type: "invitation_reject", wsInvitationReject: {rejectedById: user.getId(), rejectedByUsername: user.username, invitationId: invitationId}});
                break;
        }
    res.code(StatusCodes.OK).send(getSuccessMsg({ message: "Action carried successfully" }));
    });
}
