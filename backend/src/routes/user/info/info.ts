import { FastifyInstance } from "fastify";
import UserModel from "../../../database/user/user.db";
import { StatusCodes } from "http-status-codes";
import { MatchManager } from "../../../game-logic/match.logic";
import MatchMaking from "../../../game-logic/matchmaking.logic";



export default function UserInfoRoutes(fastify: FastifyInstance) {
    fastify.get("/me", {preHandler: fastify.authenticate({allowApi: true})} , async (req, res) => {
        const {id} = req.user;
        const user = await UserModel.findByField("id", id);
        if (!user)
            throw fastify.httpErrors.notFound("User not found");
        const state = await MatchManager.getGameState(id);
        res.code(StatusCodes.OK).send({
            success: true,
            details: {
                user: user.getSharableInfo(),
                state,
                isMatchMaking: MatchMaking.isInPool(id)
            }
        })
    });
}
