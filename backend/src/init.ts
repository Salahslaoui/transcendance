import Fastify from 'fastify';
import sensible from "@fastify/sensible"
import AuthRoutes from './routes/auth/auth';
import UserRoutes from './routes/user/user';
import RelationshipRoutes from './routes/relationships/relationships';
import fastifyCookie from '@fastify/cookie';
import authenticate from './plugins/authenticate.plugin';
import redis from './plugins/redis.plugin';
import GameRoutes from './routes/game/game';
import fastifyWebsocket from "@fastify/websocket";
import WebsocketRoutes from './routes/ws/ws';
import cors from "@fastify/cors";
import Redis from 'ioredis';
import fastifyStatic from '@fastify/static';
import path from "path";
import ApiRoutes from './routes/api/api';
import { WebSocket } from 'ws';
import { AuthOptions } from './plugins/authenticate.plugin';
import messagesRoutes from './routes/chat/messages';
import {roomRoutes} from './routes/chat/rooms';
import participantRoutes from './routes/chat/participants';
import multipart from '@fastify/multipart';
import HealthcheckRoutes from './routes/healthcheck/healthcheck';
import lobbyRoutes from './routes/tic-tac-toe/xogame';
const fastify = Fastify({
    bodyLimit: 10 * 1024 * 1024 // 10MB limit for file uploads
});


fastify.setErrorHandler((error, request, reply) => {

    reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message
    });
})

fastify.register(fastifyCookie);
fastify.register(fastifyWebsocket);
fastify.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for file uploads
    }
});
fastify.register(authenticate);
fastify.register(redis);
fastify.register(sensible);
fastify.register(AuthRoutes, {prefix: "/auth"});
fastify.register(UserRoutes, {prefix: "/user"})
fastify.register(RelationshipRoutes, {prefix: "/relationships"});
fastify.register(GameRoutes, {prefix: "/game"});
fastify.register(WebsocketRoutes, {prefix: "/ws"});
fastify.register(ApiRoutes, {prefix: "/api"});
fastify.register(HealthcheckRoutes, {prefix: "/health"});
fastify.register(messagesRoutes);
fastify.register(roomRoutes);
fastify.register(participantRoutes);
fastify.register(lobbyRoutes);

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: number;
            connectionMode: "token" | "api";
        };
    }
    interface FastifyInstance {
        authenticate: (options?: AuthOptions) => (req: FastifyRequest, res: FastifyReply) => Promise<void>;
        wsauthenticate: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
        redis: Redis;
    }
};


fastify.register(fastifyStatic, {
  root: path.join(__dirname, "uploads"), // adjust path if needed
  prefix: "/uploads/", // this will match URLs starting with /uploads
});


fastify.register(cors, {
    origin: ['https://localhost', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
});


export default fastify;
