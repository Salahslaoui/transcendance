import fastify from "../../init";
import friendRoutes from "./friends/friends";



export default function RelationshipRoutes() {
    fastify.register(friendRoutes, {prefix: "/friends"});

}