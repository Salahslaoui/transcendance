import getDB from "../../../database/db";
import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { MultipartFile } from '@fastify/multipart';

dotenv.config();


export default async function avatarRoutes(fastify: FastifyInstance) {
    // Upload avatar endpoint
    fastify.post('/avatar', { preHandler: fastify.authenticate() }, async (request, reply: FastifyReply) => {
        try {
            const userId = request.user!.id;
            const data = await request.file();
            if (!data) {
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    error: 'No file uploaded'
                });
            }
            const Types = ['image/jpeg', 'image/png'];
            if (!Types.includes(data.mimetype)) {
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    error: 'Invalid file type. Only JPEG and PNG are allowed'
                });
            }
            const maxSize = 5 * 1024 * 1024; // 5MB
            const buffer = await data.toBuffer();
            if (buffer.length > maxSize) {
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    error: 'File too large. Maximum size is 5MB'
                });
            }
            const filename = `${userId}.png`;
            const Dir = path.join(__dirname, '..', '..', '..', 'uploads', 'avatars');
            const filepath = path.join(Dir, filename);
            try {
                await fs.mkdir(Dir, { recursive: true });
            } catch (error) {
            }

            await sharp(buffer)
                .resize(200, 200, {
                    fit: 'cover',
                    position: 'center'
                })
                .png({ quality: 90 })
                .toFile(filepath);
            const avatarUrl = `/uploads/avatars/${filename}`;
            const db = await getDB();
            await db.run('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, userId]);
            const user = await db.get('SELECT avatar_url, updated_at FROM users WHERE id = ?', [userId]);
            const response = {
                success: true,
                details: {
                    avatar_url: user.avatar_url,
                    updated_at: user.updated_at,
                    message: 'Avatar updated successfully',
                }
            };
            return reply.status(StatusCodes.OK).send(response);
        } catch (error: any) {
            console.error('Avatar upload error:', error);
			if (error.statusCode)
				throw error;
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                error: 'Failed to upload avatar',
                details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
            });
        }
    });

    fastify.get('/:userId/avatar', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        try {
            const userId = request.params.userId;
            const db = await getDB();
            const user = await db.get('SELECT avatar_url FROM users WHERE id = ?', [userId]);
            if (!user) {
                return reply.status(StatusCodes.NOT_FOUND).send({
                    error: 'User not found'
                });
            }
            return reply.status(StatusCodes.OK).send({
                avatar_url: user.avatar_url
            });
        } catch (error) {
            console.error('Error getting avatar:', error);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                error: 'Failed to get avatar'
            });
        }
    });

    // Delete avatar endpoint (reset to default)
    fastify.delete('/avatar', { preHandler: fastify.authenticate() }, async (request, reply: FastifyReply) => {
        try {
            const userId = request.user!.id;
            const filename = `${userId}.png`;
            const Dir = path.join(__dirname, '..', '..', '..', 'uploads', 'avatars');
            const filepath = path.join(Dir, filename);
            try {
                await fs.unlink(filepath);
            } catch (error) {
            }
            const defaultAvatarUrl = '/uploads/avatars/default.png';
            const db = await getDB();
            await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [defaultAvatarUrl, userId]);
            return reply.status(StatusCodes.OK).send({
                message: 'Avatar reset to default',
                avatar_url: defaultAvatarUrl
            });
        } catch (error) {
            console.error('Error deleting avatar:', error);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                error: 'Failed to delete avatar'
            });
        }
    });
}
