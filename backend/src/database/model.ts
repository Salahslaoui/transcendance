import getDB from "./db";

export default class Model {
    protected static table_name: string; // User instance doesn't exist yet, so you can't ask an instance "what is your table name?". The information must belong to the factory (the class) itself. That's what static does—it attaches the information to the class.
    protected is_usable: boolean;
    protected id: any;
    private constructorM: typeof Model;
    protected static keys: string[];

    constructor(data?: Partial<Record<string, any>>) { // witout Partial, this won't be possible: new User({ username: 'twin' })
        this.is_usable = true;
        this.constructorM = this.constructor as typeof Model;
        if (data) {
            Object.assign(this, data);
        }
    }

    protected ensureUsable() {
        if (!this.is_usable) throw new Error("Unusable user");
    }

    protected setKeys() {
        this.constructorM.keys = Object.keys(this)
            .filter(key => !["table_name", "is_usable", "id", "constructorM"].includes(key)); // loops over the current object keys, if the key in one of these ["table_name", "is_usable", "id", "constructorM"], don't add it, since we don't want it as a column in our row
    }

    async save() {
        this.ensureUsable();
        const keys = this.constructorM.keys;
        const values = keys.map(key => (this)[key as keyof this]);
        const setClause = keys.map(key => ` ${key}=?`).join(',');
        const db = await getDB();
        const sqlQuery = `UPDATE ${this.constructorM.table_name} SET ${setClause} WHERE id=?`;
        await db.run(sqlQuery, [...values, this.id]);
    }

    async reload() {
        this.ensureUsable();
        const db = await getDB();
        const result = await db.get(`SELECT * FROM ${this.constructorM.table_name} WHERE id=?`, [this.id]);
        if (!result) {
            this.is_usable = false;
            throw new Error(`Select failed in ${this.constructorM.table_name}`);
        }
        const keys = this.constructorM.keys;
        for (let key of keys) {
            (this)[key as keyof this] = result[key];
        }
    }

    async delete() {
        this.ensureUsable();
        const db = await getDB();
        await db.run(`DELETE FROM ${this.constructorM.table_name} WHERE id=?`, [this.id]);
        this.is_usable = false;
    }

    getId() {
        return this.id;
    }

    static async create<T extends typeof Model>(this: T, data: Record<string, any>): Promise<InstanceType<T>> {
        const keys = Object.keys(data);
        if (keys.length == 0)
            throw new Error("Empty data not accepted");
        const db = await getDB();
        const result = await db.run(`
            INSERT INTO ${this.table_name} (${keys.join(",")})
            VALUES (${new Array(keys.length).fill("?").join(",")})`,Object.values(data));
        const row = await db.get<T>(`SELECT * FROM ${this.table_name} WHERE id=?`, result.lastID);
        const instance = new this(row) as InstanceType<T>;
        return instance;
    }

    static async createOrIgnore<T extends typeof Model>(this: T, data: Record<string, any>): Promise<InstanceType<T>> {
        const keys = Object.keys(data);
        if (keys.length == 0)
            throw new Error("Empty data not accepted");
        const db = await getDB();
        const result = await db.run(`
            INSERT OR IGNORE INTO ${this.table_name} (${keys.join(",")})
            VALUES (${new Array(keys.length).fill("?").join(",")})`,Object.values(data));
        const row = await db.get<T>(`SELECT * FROM ${this.table_name} WHERE id=?`, result.lastID);
        const instance = new this(row) as InstanceType<T>;
        return instance;
    }

    static async findByField<T extends typeof Model>(this: T, field: string, value: any): Promise<InstanceType<T> | undefined> {
        const db = await getDB();
        const row = await db.get<Record<string, any>>(`SELECT * FROM ${this.table_name} WHERE ${field}=?`, [value]);
        if (!row)
            return undefined;
        return new this(row) as InstanceType<T>;
    }

    static getTableName() {
        return this.table_name;
    }

}
