
import fastify from "../../init";
import getDB from "../db";
import UserModel, { User, UserSharableInfo } from "../user/user.db";


export type Friendship = {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: 'pending' | 'accepted';
  created_at: string;
  blocker_id: number | undefined;
  updated_at: string;
};

export async function checkIfFriends(
  user1ID: number,
  user2ID: number
): Promise<boolean> {
  const db = await getDB();

  const result = await db.get<Friendship>(
    `
    SELECT *
    FROM friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = ? AND addressee_id = ?)
        OR (requester_id = ? AND addressee_id = ?)
      )
    `,
    [user1ID, user2ID, user2ID, user1ID]
  );
  return result !== undefined && !Boolean(result.blocker_id);
}


export async function getBlockedUsers(userId: number): Promise<UserSharableInfo[]> {
  const db = await getDB();
  const blockedFriendships = await db.all<Friendship[]>(`SELECT * FROM friendships
                                          WHERE (requester_id = ? OR addressee_id = ?)
                                          AND status = ?
                                          AND blocker_id = ?
                                          `, [userId , userId,  'accepted', userId]);
  const blockedUsers = await Promise.all(
    blockedFriendships.map(async (bU) => {
      const user = await UserModel.findByField("id", bU.requester_id === userId ? bU.addressee_id : bU.requester_id  );
      if (!user) return undefined;

      return {
        ...user.getSharableInfo(),
        is_online: false,
        game_state: "idle",
      } as UserSharableInfo;
    })
  );
  // TypeScript type guard.
  // If u is not undefined, then treat u as UserSharableInfo
  // A way to make ts make sure that this is in face a UserSharableInfo
  return blockedUsers.filter(
    (u): u is UserSharableInfo => u !== undefined
  );

}

export async function getFriends(userId: number, invitable:boolean=false) {
  const db = await getDB();
  const friends = await db.all<Friendship[]>('SELECT * FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = ?', [userId , userId,  'accepted']);
  if (!friends)
    return [];
  const users = await Promise.all(friends.map(async friend => {
      if (Boolean(friend.blocker_id))
          return undefined;
      const user = await UserModel.findByField("id", userId == friend.requester_id ? friend.addressee_id : friend.requester_id);
      if (!user || (invitable && !user.isOnline() && user.game_state == "idle"))
        return undefined;
      return (user.getSharableInfo());
  }));
  return users.filter(Boolean).sort((a, b) => Number(b!.is_online) - Number(a!.is_online));
}

export async function getFriendsMatching(userId: number, sequence: string, invitable: boolean) {
  const db = await getDB();
  let friends: Friendship[] = [];
  if (sequence === "")
    friends = await db.all<Friendship[]>('SELECT * FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = ?', [userId , userId, 'accepted']);
  else
    friends = await db.all<Friendship[]>(`SELECT
                                              f.id,
                                              f.requester_id,
                                              f.addressee_id,
                                              f.status,
                                              f.created_at,
                                              f.updated_at,
                                              f.blocker_id
                                          FROM
                                              users AS u
                                          JOIN
                                              friendships AS f ON (
                                                  (f.requester_id = u.id AND f.addressee_id = ?) OR
                                                  (f.addressee_id = u.id AND f.requester_id = ?)
                                              )
                                          WHERE
                                              f.status = ?
                                              AND LOWER(u.username) LIKE ?;`
                                          , [userId , userId, 'accepted', `%${sequence}%`]);

  if (!friends)
    return [];
  const users = await Promise.all(friends.map(async friend => {
      if (invitable && Boolean(friend.blocker_id))
          return undefined;
      const user = await UserModel.findByField("id", userId == friend.requester_id ? friend.addressee_id : friend.requester_id);
      if (!user || (invitable && (!user.isOnline() || user.game_state !== "idle")))
          return undefined;
      return user.getSharableInfo(friend.blocker_id);
  }));

  return users.filter(Boolean);
}
