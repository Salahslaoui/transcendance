import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import getDB from "../../../database/db";
import { modifyusernameSchema, modifyPasswordSchema } from "../../../schemas/modify.shema";

dotenv.config();

export default async function modifyRoutes(fastify: FastifyInstance) {
  // to modify the username of the user
  fastify.post('/username', {schema: modifyusernameSchema, preHandler: fastify.authenticate()}, async (request, reply) => {
    const currentUserId = request.user!.id;
    const { newusername } = request.body as { newusername: string };
    try {
      const db = await getDB();
      const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [currentUserId]);
      if (!currentUser)
        throw fastify.httpErrors.notFound('User not found');
      const currentUsername = currentUser.username;
      if (newusername === currentUsername)
        throw fastify.httpErrors.badRequest('Username must be different from the current one');
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [newusername, currentUserId]
      );
      if (existingUser)
        throw fastify.httpErrors.conflict('Username is already taken');
      await db.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [newusername, currentUserId]
      );
      return reply.code(StatusCodes.OK).send({
        success: true,
        details: { message: 'Username updated successfully', newusername }
      });
    } catch (err: any) {
      console.error('Error updating username:', err);
      if (err.statusCode)
        throw err;
      throw fastify.httpErrors.internalServerError('Failed to update username');
    }
  });
  // to modify the password of the user
  fastify.post('/password', { schema: modifyPasswordSchema, preHandler: fastify.authenticate() }, async (request, reply) => {
    const currentUserId = request.user!.id;
    const { oldPassword, newPassword } = request.body as { oldPassword: string; newPassword: string };
    try {
      const db = await getDB();
      const user = await db.get('SELECT * FROM users WHERE id = ?', [currentUserId]);
      if (!user) {
        throw fastify.httpErrors.notFound('User not found');
      }
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        throw fastify.httpErrors.badRequest('Current password is incorrect');
      }
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw fastify.httpErrors.badRequest('New password must be different from current password');
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, currentUserId]);
      return reply.code(StatusCodes.OK).send({
        success: true,
        details: { message: 'Password updated successfully' }
      });
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.statusCode) {
        throw err;
      }
      throw fastify.httpErrors.internalServerError('Failed to update password');
    }
  });
}
