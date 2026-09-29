import sqlite3  from "sqlite3";
import getDB from './db'

const initDB = async () => {
  const db = await getDB();



  await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      avatar_url TEXT DEFAULT '/uploads/avatars/default.png',
      game_state TEXT NOT NULL CHECK (game_state in ('idle', 'in_game')) DEFAULT idle,
      provider TEXT NOT NULL DEFAULT 'local',
	    xp INTEGER NOT NULL DEFAULT 0,
	    level INTEGER NOT NULL DEFAULT 1,
      two_fa_secret TEXT,
      is_two_fa_enabled BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        addressee_id INTEGER NOT NULL,
        status TEXT CHECK(status IN ('pending', 'accepted')) NOT NULL DEFAULT 'pending',
        blocker_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id),
        FOREIGN KEY (addressee_id) REFERENCES users(id),
        FOREIGN KEY (blocker_id) REFERENCES users(id),
        UNIQUE(requester_id, addressee_id)
      );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS block (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      UNIQUE (user_id, blocked_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )
    `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS match (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      game_type TEXT CHECK(game_type IN ('ping_pong', 'tic_tac_toe')) NOT NULL,
      score_player1 INTEGER DEFAULT 0,
      score_player2 INTEGER DEFAULT 0,
      winner_id INTEGER NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      mode TEXT CHECK (mode IN ('matchmaking', '1v1', 'tournament')),
      tournament_id INTEGER,
      FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      creator_id INTEGER NOT NULL,
      state TEXT CHECK(state IN ('pending', 'ongoing', 'finished')) NOT NULL DEFAULT 'pending',
      max_player_count INTEGER NOT NULL,
      current_player_count INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      state TEXT CHECK(state IN ('in', 'out')) NOT NULL DEFAULT 'in',
      UNIQUE (tournament_id, player_id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT -- <--- No comma here!
    )
  `);
  await db.exec(`
    create table if not exists messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
    `);
  await db.exec(`
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          room_id INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          UNIQUE (user_id, room_id)
        );
      `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_hash STRING NOT NULL,
      user_id INTEGER UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    `)
};

export default initDB;
