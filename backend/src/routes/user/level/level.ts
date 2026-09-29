import getDB from "../../../database/db";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";

//the formula is xpRequired(level) = 500 + (level - 1) * 250
//level 1 -> 500 xp
// level 2 -> 750 xp
// level 3 -> 1000 xp
// level 4 -> 1250 xp
// level 5 -> 1500 xp
// level 6 -> 1750 xp
// level 7 -> 2000 xp
// level 8 -> 2250 xp
// level 9 -> 2500 xp
// level 10 -> 2750 xp
// hadchi fih lmath bzf tla3li frasi
// each win gives the player 100 xp

export async function addXp(id: number){
	const db = await getDB();
	const result = await db.run(`UPDATE users SET xp = xp + 100 WHERE id = ?`, [id]);
	return result;
}

export function xpNeeded(level: number) : number {
	return 500 + (level - 1) * 250;
}

export default async function LevelSystemRoutes(fastify: FastifyInstance) {
	fastify.post('/test-upload', async (request: FastifyRequest, reply: FastifyReply) => {
		const db = await getDB();
		const result = await db.run(`UPDATE users SET xp = 0, level= 1 WHERE id = 1`);
		return reply.status(StatusCodes.OK).send({
			success: true,
			data: result
		});
	})
	fastify.get('/users/:id', { preHandler: fastify.authenticate() }, async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = (request.params as any).id;
		const db = await getDB();
		const user = await db.get(`
			SELECT * FROM users WHERE id = ?`, [userId]);
		if (!user) {
			return reply.status(StatusCodes.NOT_FOUND).send({
				success: false,
				message: 'User not found'
			});
		}
		let xpToNextLevel = xpNeeded(user.level + 1);
		let currentXP = user.xp;
  		let currentLevel = user.level;
  		while (currentXP >= xpToNextLevel) {
  		  currentXP -= xpToNextLevel;
  		  currentLevel++;
  		  xpToNextLevel = xpNeeded(currentLevel + 1);
  		}
		if (currentLevel !== user.level || currentXP !== user.xp)
			await db.run(`UPDATE users SET level = ?, xp = ? WHERE id = ?`, [currentLevel, currentXP, userId]);

		let currentLevelXp = xpNeeded(currentLevel);
		let xpRemaining = xpToNextLevel - currentXP;
		let xpProgress = currentXP / xpToNextLevel;
		let xpProgressPercent = Math.max(0, Math.min(100, Math.floor(xpProgress * 100)));
		return reply.status(StatusCodes.OK).send({
			success: true,
			data: {
				id: user.id,
				xp: currentXP,
				level: currentLevel,
				xpToNextLevel,
				xpRemaining,
				currentLevelXp,
				xpProgress : xpProgressPercent,
			}
		});
	});
}
