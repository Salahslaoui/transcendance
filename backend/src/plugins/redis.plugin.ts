import fp from "fastify-plugin";
import {redis} from "../redis/redis"


export default fp(async (fastify) => {
    
    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async () => {
        await redis.quit();
    });
});
