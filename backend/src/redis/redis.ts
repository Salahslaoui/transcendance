import Redis from "ioredis";


export const redis = process.env.NODE_ENV === "production" 
    ? new Redis({
        host: "redis",
        port: 6379
    }) : new Redis({
        host: "127.0.0.1",
        port: 6379
});


export abstract class RedisModel {
    protected static prefix: string;
    protected static ex?: number;


    constructor() {}

    private static  key(id: string) {
        return `${this.prefix}:${id}`;
    }


    public static async incr() {
        return  await redis.incr(`${this.prefix}:id`);
    }

    private static convertId(id: string | number) {
        return typeof id === "number" ? String(id) : id;
    }

    public static async set<T extends object>(id: string | number, value: T) {
        id = this.convertId(id);
        try {
            const toSave = JSON.stringify(value);
            if (this.ex)
                await redis.set(this.key(id), toSave, "EX", this.ex);
            else
                await redis.set(this.key(id), toSave);
        } catch (err) {
            throw Error("Value could not be serialized to JSON");
        }
    }


    public static async get<T extends object>(id: string | number): Promise<T | null> {
        id = this.convertId(id);
        const toGet = await redis.get(this.key(id));
        if (!toGet)
            return null;
        return JSON.parse(toGet);
    }

    public static async delete(id: string | number) {
        id = this.convertId(id);
        await redis.del(this.key(id));
    }
}

export class InvitationRedisModel extends RedisModel {
    protected static prefix: string = "invite";
    protected static ex: number = 30;
}

export class TSessionRedisModel extends RedisModel {
    protected static prefix: string = "Tinvite";
    protected static ex: number = 200;
}
