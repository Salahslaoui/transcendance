import getDB from "../../../database/db";
import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import UserModel from "../../../database/user/user.db";

export default async function userProfileRoutes(fastify: FastifyInstance) {
	fastify.get('/:id/profile', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = request.params as { id: string };
		try {
			const db = await getDB();
			const user = await db.get('SELECT id, username, email, avatar_url FROM users WHERE id = ?', [userId.id]);
			if (!user) {
				return reply.status(StatusCodes.NOT_FOUND).send({ 
					success: false,
					message: 'User not found' 
				});
			}
			return reply.code(StatusCodes.OK).send({ 
				success: true,
				message: 'User profile retrieved successfully',
				details: user
			});
		} catch (err) {
			console.error("Error fetching user profile:", err);
			return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: 'Internal Server Error' });
		}
	});
	fastify.get('/:id/stats', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = request.params as { id: string };
		try {
			const db = await getDB();
			const result = await db.all(`
				SELECT
					game_type,
					SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS wins,
					SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) AS losses,
					SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END) AS draws
				FROM match
				WHERE player1_id = ? OR player2_id = ?
				GROUP BY game_type
				`, [userId.id, userId.id, userId.id, userId.id]);
			if (result.length === 0) {
				return reply.status(StatusCodes.OK).send({
					success: true,
					message: 'No stats found for user',
					details: []
				});
			}
			return reply.code(StatusCodes.OK).send({
				success: true,
				message: 'User stats retrieved successfully',
				details: result
			});
		} catch (err) {
			console.error("Error fetching user stats:", err);
			return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
				success: false,
			 	error: 'Failed to fetch user stats'
			});
		}
	});
	fastify.get('/:id/matches', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = request.params as { id: string };
		try {
			const db = await getDB();
			const query = `
    	  		SELECT 
    	  			m.id,
    	  			m.game_type,
    	  			m.mode,
    	  			m.played_at,
					m.score_player1,
					m.score_player2,
    	  			CASE 
    	  				WHEN m.winner_id IS NULL THEN 'draw'
    	  				WHEN m.winner_id = :userId THEN 'win'
    	  				ELSE 'lose'
    	  			END AS result,
    	  			CASE 
    	  				WHEN m.player1_id = :userId THEN u2.username
    	  				ELSE u1.username
    	  			END AS opponent_name,
    	  			CASE 
    	  				WHEN m.player1_id = :userId THEN u1.username
    	  				ELSE u2.username
    	  			END AS player_name,
					CASE 
						WHEN m.winner_id IS NULL THEN NULL
						WHEN m.winner_id = m.player1_id THEN m.score_player1
						ELSE m.score_player2
					END AS winner_score,
					CASE 
						WHEN m.winner_id IS NULL THEN NULL
						WHEN m.winner_id = m.player1_id THEN m.score_player2
						ELSE m.score_player1
					END AS loser_score
    	  			FROM match AS m
    	  			JOIN users AS u1 ON m.player1_id = u1.id
    	  			JOIN users AS u2 ON m.player2_id = u2.id
    	  			WHERE m.player1_id = :userId OR m.player2_id = :userId
    	  			ORDER BY m.played_at DESC;
    			`;
			const result = await db.all(query, {':userId': userId.id})
		  	if (result.length === 0) {
			return reply.status(StatusCodes.OK).send({
				success: false,
				message: 'No matches found for user',
				details: []
			});
		  }
		  return reply.code(StatusCodes.OK).send({
			  success: true,
			  message: 'Match history retrieved successfully',
			  details: result
		  });
		} catch (err) {
			console.error("Error fetching user matches:", err);	
			return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
				success: false,
				error: 'Failed to fetch user matches'
			});
		}
	});
}