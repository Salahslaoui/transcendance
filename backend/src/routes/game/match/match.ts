import { FastifyInstance } from "fastify";
import UserModel from "../../../database/user/user.db";
import MatchMaking from "../../../game-logic/matchmaking.logic";
import { StatusCodes } from "http-status-codes";
import { getSuccessMsg } from "../../../helpers/utils";
import { MatchManager } from "../../../game-logic/match.logic";



export default function MatchRoutes(fastify: FastifyInstance) {
    fastify.post("/find-match", {preHandler: fastify.authenticate({allowApi: true})}, async (req, res) => {
        const {id} = req.user;
        const user = await UserModel.findByField("id", id);
        if (!user)
            throw fastify.httpErrors.badRequest("User not found in database");
        if (await MatchMaking.joinPool(user)) {
            user.sendViaWs({type: "matchmaking_start"});
            return res.code(StatusCodes.OK).send({success: true, details: {message: 'Joined Queue'}});
        }
        throw fastify.httpErrors.conflict("You are already in matchmaking");
    });

    fastify.delete("/cancel-matchmaking", {preHandler: fastify.authenticate({allowApi: true})}, async (req, res) => {
        const {id} = req.user;
        if (await MatchMaking.quitPool(id)) {
            res.code(StatusCodes.OK).send(getSuccessMsg({message: "Left Queue"}));
            const user = await UserModel.findByField("id", id);
            user?.sendViaWs({type: "matchmaking_end"});
            return;
        }
        
        throw fastify.httpErrors.conflict("You aren't in matchmaking");
    });

    fastify.post("/stop-match", {preHandler: fastify.authenticate({allowApi: true})}, async (req, res) => {
        const {id} = req.user;
        const match = MatchManager.currentMatches[id];
        if (!match)
            throw fastify.httpErrors.notFound("Match not found");
        return res.code(StatusCodes.OK).send(getSuccessMsg({message: "Match stopped succesfully"}));
    });
}
