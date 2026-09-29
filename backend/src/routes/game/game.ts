import { FastifyInstance } from "fastify";
import TounramentRoutes from "./tournament/tournament";
import MatchRoutes from "./match/match";
import InviteRoutes from "./invite/invite";
import matchHistoryRoutes from "./match/matchHistory";
import LeaderBoardRoutes from "./leaderboard/leaderboard";


export default function GameRoutes(fastify: FastifyInstance) {
    fastify.register(TounramentRoutes, {prefix: "/tournament"});
    fastify.register(MatchRoutes, {prefix: "/match"});
    fastify.register(InviteRoutes, {prefix: "/invite"});
	fastify.register(matchHistoryRoutes, {prefix: "/match-history/user"});
	fastify.register(LeaderBoardRoutes, {prefix: "/leaderboard"});
}