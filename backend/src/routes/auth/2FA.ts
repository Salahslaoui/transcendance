import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import getDB from "../../database/db";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

dotenv.config();

export function verify2FA(secret: string, token: string): boolean {
	if (!secret || !token)
		return false;
	const verified = speakeasy.totp.verify({
    	secret,
    	encoding: "base32",
    	token,
  	});
  	return verified;
}

export default async function TwoFARoutes(fastify: FastifyInstance) {
    fastify.post('/2fa/setup', {preHandler: fastify.authenticate()}, async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user.id;
        const db = await getDB();
        const secret = speakeasy.generateSecret({
            name: "ft_transcendence",
        });
        try {
            await db.run(`UPDATE users SET two_fa_secret = ? WHERE id = ?`, [secret.base32, userId]);
            const qr = await qrcode.toDataURL(secret.otpauth_url!);
            return reply.status(StatusCodes.OK).send({
                success: true,
                messag: "Scan this QR code with your authenticator app",
                secret: secret.base32,
                qrCode:  qr
            });
        } catch (err) {
            console.error(err);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                message: 'Internal Server Error'
            });
        }
    });
    fastify.post('/2fa/verify', {preHandler: fastify.authenticate()}, async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user.id;
        const {token} = request.body as {token: string};
        const db = await getDB();
        try {
            const user = await db.get(`SELECT two_fa_secret FROM users WHERE id = ?`, [userId]);
            const verify = speakeasy.totp.verify({
                secret: user.two_fa_secret,
                encoding: 'base32',
                token: token,
                window: 1
            });
            if (!verify) {
                return reply.status(StatusCodes.UNAUTHORIZED).send({
                    success: false,
                    message: 'Invalid 2FA token'
                });
            }
            await db.run(`UPDATE users SET is_two_fa_enabled = 1 WHERE id = ?`, [userId]);
            return reply.status(StatusCodes.OK).send({
                success: true,
                message: '2FA token verified successfully'
            });
        } catch(err) {
            console.error(err);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                message: 'Internal Server Error'
            });
        }
    });
    fastify.post('/2fa/disable', {preHandler: fastify.authenticate()}, async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user.id;
        const db = await getDB();
        try {
            await db.run(`UPDATE users SET two_fa_secret = NULL, is_two_fa_enabled = 0 WHERE id = ?`, [userId]);
            return reply.status(StatusCodes.OK).send({
                success: true,
                message: '2FA disabled successfully'
            });
        } catch (err) {
            console.error(err);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                message: 'cannot disable 2FA'
            });
        }
    });
}
