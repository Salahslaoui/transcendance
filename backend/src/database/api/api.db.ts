import Model from "../model";
import crypto from "crypto";

export interface Api {
    id: number;
    api_key_hash: string;
    user_id: number;
    created_at: string;
}

export default class ApiModel extends Model {
    protected id: number;
    public api_key_hash: string;
    public user_id: number;
    public created_at: string;
    protected static table_name: string = "api_keys";


    constructor(api: Api) {
        super();
        this.id = api.id;
        this.api_key_hash = api.api_key_hash;
        this.user_id = api.user_id;
        this.created_at = api.created_at;
        this.setKeys();

    }

    static generateApiKey() {
        return crypto.randomBytes(15).toString("hex");
    }

    static hashApiKey(key: string) {
        return crypto.createHash("sha256").update(key).digest("hex");
    }

    async rotateKey() {
        const key = ApiModel.generateApiKey();
        this.api_key_hash = ApiModel.hashApiKey(key);
        await this.save();
        return key;
    }




}