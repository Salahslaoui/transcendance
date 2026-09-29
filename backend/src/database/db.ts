import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

let dbInstance: Database | null = null;

const getDB = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    const baseDir = path.resolve(__dirname, "../..");
    const dbPath = path.join(baseDir, "data", "auth.db");

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });


    await dbInstance.exec("PRAGMA foreign_keys = ON;"); // enable foregin keys functionalities (delete on cascase...)
    await dbInstance.exec("PRAGMA busy_timeout = 5000;"); // if db is locked ->> wait 5 secs before failing
    await dbInstance.exec("PRAGMA journal_mode = WAL;");  // seperate writing and reading to 2 different files, reading from original file, writing to sqlite-wal file, these new changes are then coppied to original (Checkpointing)

    return dbInstance;
};

export default getDB;
