import { FastifyInstance } from "fastify";
import modifyRoutes from "./modify/modify";
import avatarRoutes from "./modify/avatar";
import LevelSystemRoutes from "./level/level";
import UserInfoRoutes from "./info/info";


export default function UserRoutes(fastify: FastifyInstance) {
    fastify.register(modifyRoutes, {prefix: "/modify"});
    fastify.register(avatarRoutes, {prefix: "/modify"});
    fastify.register(LevelSystemRoutes, {prefix: "/levels"});
    fastify.register(UserInfoRoutes, {prefix: "/info"})
}