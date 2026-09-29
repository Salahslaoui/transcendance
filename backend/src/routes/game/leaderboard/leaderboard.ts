import getDB from "../../../database/db";
import fastify, { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";

export default async function LeaderBoardRoutes(fastify: FastifyInstance) {
	fastify.get('/ping-pong', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const db = await getDB();
		const leaderboard = await db.all(`
			SELECT 
			  users.id,
			  users.username,
			  users.avatar_url,
			  COUNT(match.winner_id) AS wins
			FROM users
			LEFT JOIN match 
			  ON users.id = match.winner_id 
			  AND match.game_type = 'ping_pong'
			GROUP BY users.id
			ORDER BY wins DESC;
		`);
  		return reply.status(StatusCodes.OK).send({
  		  success: true,
  		  data: leaderboard
  		});
	});
	fastify.get('/tic-tac-toe', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const db = await getDB();
		const leaderboard = await db.all(`
			SELECT 
			  users.id,
			  users.username,
			  users.avatar_url,
			  COUNT(match.winner_id) AS wins
			FROM users
			LEFT JOIN match 
			  ON users.id = match.winner_id 
			  AND match.game_type = 'tic_tac_toe'
			GROUP BY users.id
			ORDER BY wins DESC;
		`);
  		return reply.status(StatusCodes.OK).send({
  		  success: true,
  		  data: leaderboard
  		});
	});
}