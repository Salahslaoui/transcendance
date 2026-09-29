import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import getDB from "../../../database/db";
import { getOnlineFriends, getSuccessMsg } from "../../../helpers/utils";
import { Friendship, getBlockedUsers, getFriends, getFriendsMatching } from "../../../database/relationships/friends.db";
import UserModel from "../../../database/user/user.db";

dotenv.config();

interface ListQuery {
  invitable?: string;
  blocked?: string;
}

const friendRequestSchema = {
  body: {
    type: 'object',
    required: ['targetUserId'],
    properties: {
      targetUserId: { type: 'number', minimum: 1 }
    }
  }
};

const friendSchema = {
  params: {
    type: 'object',
    required: ['requestId'],
    properties: {
      requestId: { type: 'string', pattern: '^[0-9]+$' }
    }
  }
};

const friendListSchema = {
    params: {
        type: 'object',
        properties: {
          sequence: { type: 'string', default: '' }
        }
      }
}

export default async function friendRoutes(fastify: FastifyInstance) {
    // POST request - Send friend request
    fastify.post('/request', {schema: friendRequestSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const { targetUserId } = req.body as { targetUserId: number };
        const currentUserId = req.user!.id;
        if (targetUserId === currentUserId) {
            return res.code(StatusCodes.BAD_REQUEST).send({
                success: false,
                details: { error: 'You cannot send a friend request to yourself' }
            });
        }
        const db = await getDB();
        try {
            const targetUser = await db.get('SELECT id, username FROM users WHERE id = ?', [targetUserId]);
            if (!targetUser) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'Target user not found' }
                });
            }
            const checkFriend = await db.get(`
                    SELECT * FROM friendships WHERE
                    (requester_id = ? AND addressee_id = ?)
                    OR (requester_id = ? AND addressee_id = ?)
                `, [currentUserId, targetUserId, targetUserId, currentUserId]);
            if (checkFriend) {
                if (checkFriend.status === 'accepted') {
                    return res.code(StatusCodes.BAD_REQUEST).send({
                        success: false,
                        details: { error: 'Friend request already accepted' }
                    });
                } else if (checkFriend.status === 'pending') {
                    return res.code(StatusCodes.BAD_REQUEST).send({
                        success: false,
                        details: { error: 'Friend request already sent and pending' }
                    });
                    } else if (checkFriend.blocker_id === null) {
                        return res.code(StatusCodes.BAD_REQUEST).send({
                            success: false,
                            details: { error: 'You have been blocked by this user' }
                        });
                    }
            } else {
                const result = await db.run(`
                    INSERT INTO friendships (requester_id, addressee_id, status)
                    VALUES (?, ?, 'pending')
                `, [currentUserId, targetUserId]);
                const currentUser = await UserModel.findByField("id", currentUserId);
                const targetUserModel = await UserModel.findByField("id", targetUserId);

                if (currentUser && targetUserModel) {
                    await targetUserModel.sendViaWs({
                        type: "friend_request",
                        friendRequest: {
                            id: result.lastID!,
                            requester_id: currentUserId,
                            username: currentUser.username,
                            avatar_url: currentUser.avatar_url
                        }
                    });
                }

                return res.code(StatusCodes.CREATED).send({
                    success: true,
                    details: {
                        message: `Friend request sent to ${targetUser.username}`,
                        requestId: result.lastID
                    }
                });
            }
        } catch (err: any) {
            console.error('Error sending friend request:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to send friend request' }
            });
        }
    });
    fastify.post('/accept/:requestId', {schema: friendSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const {id} = req.user;
        const { requestId: requestIdStr } = req.params as { requestId: string };
        const requestId = parseInt(requestIdStr, 10);
        const currentUserId = req.user!.id;
        const db = await getDB();
        try {
            const request = await db.get('SELECT * FROM friendships WHERE id = ? AND addressee_id = ?', [requestId, currentUserId]);
            if (!request) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'Friend request not found' }
                });
            }
            if (request.status !== 'pending') {
                return res.code(StatusCodes.BAD_REQUEST).send({
                    success: false,
                    details: { error: 'Friend request is not pending' }
                });
            }
            await db.run('UPDATE friendships SET status = ? WHERE id = ?', ['accepted', requestId]);

            const friendId = request.requester_id == id ? request.addressee_id : request.requester_id;
            const friend = (await UserModel.findByField("id", friendId))!;
            const meInfo = (await UserModel.findByField("id", id))!.getSharableInfo(request.blocker_id);
            friend.sendViaWs({
                type: "friend_add",
                friendInfo: meInfo
            });
            res.code(StatusCodes.OK).send({
                success: true,
                details: { message: `Friend request accepted from user ${request.requester_id}` , friend: friend.getSharableInfo()}
            });
        } catch (err: any) {
            console.error('Error accepting friend request:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to accept friend request' }
            });
        }
    });
    // reject friend request
    fastify.post('/reject/:requestId', {schema: friendSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const { requestId: requestIdStr } = req.params as { requestId: string };
        const requestId = parseInt(requestIdStr, 10);
        const currentUserId = req.user!.id;
        const db = await getDB();
        try {
            const request = await db.get('SELECT * FROM friendships WHERE id = ? AND addressee_id = ?', [requestId, currentUserId]);
            if (!request) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'Friend request not found' }
                });
            }
            await db.run('DELETE FROM friendships WHERE id = ?', [ requestId]);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { message: `Friend request rejected from user ${request.requester_id}` }
            });
        } catch (err : any) {
            console.error('Error rejecting friend request:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to reject friend request' }
            });
        }
    });

    fastify.post('/block/:requestId', {schema: friendSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const { requestId: requestIdStr } = req.params as { requestId: string };
        const requestId = parseInt(requestIdStr, 10); // what is requestId ??
        const currentrequestId = req.user!.id;
        if (requestId === currentrequestId) {
            return res.code(StatusCodes.BAD_REQUEST).send({
                success: false,
                details: { error: 'You cannot block/unblock yourself' }
            });
        }
        const db = await getDB();
        try {
            const targetUser = await db.get('SELECT id FROM users WHERE id = ?', [requestId]);
            if (!targetUser) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'User not found' }
                });
            }
            const friendship = await db.get<Friendship>(
                'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
                [currentrequestId, requestId, requestId, currentrequestId]
            );
            if (!friendship)
                throw fastify.httpErrors.badRequest("You can only block your friends");
            if (friendship.blocker_id != null)
                throw fastify.httpErrors.badRequest("You already blocked or have been blocked by this user");
            await db.run('UPDATE friendships SET blocker_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [currentrequestId, friendship.id]);
            res.code(StatusCodes.OK).send({
                success: true,
                details: { message: `User ${requestId} has been blocked` }
            });

            const friend = (await UserModel.findByField("id", requestId))!;
            const me = await UserModel.findByField("id", currentrequestId);
            friend.sendViaWs({
                type: "user_blocked",
                blocker: currentrequestId
            });
            me?.sendViaWs({
                type: "self_user_blocked",
                blocked: requestId
            })
        } catch (err: any) {
            console.error('Error blocking user:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to block user' }
            });
        }
    });

    fastify.post('/unblock/:requestId', {schema: friendSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const { requestId: requestIdStr } = req.params as { requestId: string };
        const requestId = parseInt(requestIdStr, 10);
        const currentrequestId = req.user!.id;
        if (requestId === currentrequestId) {
            return res.code(StatusCodes.BAD_REQUEST).send({
                success: false,
                details: { error: 'You cannot block/unblock yourself' }
            });
        }
        const db = await getDB();
        try {
            const targetUser = await db.get('SELECT id FROM users WHERE id = ?', [requestId]);
            if (!targetUser) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'User not found' }
                });
            }
            const friendship = await db.get<Friendship>(
                'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
                [currentrequestId, requestId, requestId, currentrequestId]
            );
            if (!friendship)
                throw fastify.httpErrors.badRequest("Friendship doesn't exist");
            if (!Boolean(friendship.blocker_id) || friendship.blocker_id != currentrequestId)
                throw fastify.httpErrors.conflict("Can't block a user you haven't blocked");
            await db.run('UPDATE friendships SET blocker_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [null, friendship.id]);
            const friend = (await UserModel.findByField("id", requestId))!;
            const me = (await UserModel.findByField("id", currentrequestId))!;
            friend.sendViaWs({
                type: "user_unblocked",
                blocker: currentrequestId
            });
            me.sendViaWs({
                type: "self_user_unblocked",
                blocked: requestId
            });
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { message: `User ${requestId} has been unblocked` }
            });
        } catch (err: any) {
            console.error('Error unblocking user:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to unblock user' }
            });
        }
    });

    fastify.get('/is-blocked/:requestId', {preHandler: fastify.authenticate()}, async (req, res) => {
        const { requestId: requestIdStr } = req.params as { requestId: string };
        const requestId = parseInt(requestIdStr, 10);
        const currentrequestId = req.user!.id;
        if (requestId === currentrequestId) {
            return res.code(StatusCodes.BAD_REQUEST).send({
                success: false,
                details: { error: 'You cannot block/unblock yourself' }
            });
        }
        const db = await getDB();
        try {
            const targetUser = await db.get('SELECT id FROM users WHERE id = ?', [requestId]);
            if (!targetUser) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'User not found' }
                });
            }
            const friendship = await db.get(
                'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
                [currentrequestId, requestId, requestId, currentrequestId]
            );
            if (friendship){
                return res.code(StatusCodes.OK).send({
                    success: true,
                    details: {blocker_id: friendship.blocker_id}
                });
            }
        } catch (err: any) {
            console.error('Error getting blocked/unblocked user:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to unblock user' }
            });
        }
    });
    //list relationships
    fastify.get<{ Querystring: ListQuery }>('/list', {preHandler: fastify.authenticate()}, async (req, res) => {
        const currentUserId = req.user!.id;
        const blocked = req.query.blocked === 'true' ? true : false;
        const invitable = req.query.invitable === 'true' ? true : false;
        try {
            if (blocked) {
            const blockedUsers = await getBlockedUsers(currentUserId);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { users: blockedUsers }
            });
            }

            const friends = await getFriends(currentUserId, invitable);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { friends }
            });
        } catch (err: any) {
            console.error('Error fetching friends:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to fetch friends' }
            });
        }
    });

    fastify.get<{ Querystring: ListQuery }>('/list-by-match/:sequence', {schema: friendListSchema, preHandler: fastify.authenticate()}, async (req, res) => {
        const currentUserId = req.user!.id;
        const {sequence} = req.params as {sequence: string}
        const invitable = req.query.invitable === 'true' ? true : false;

        try {
            const friends = await getFriendsMatching(currentUserId, sequence, invitable);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { friends }
            });
        } catch (err: any) {
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to fetch friends' }
            });
        }
    });

    // show pending friends
    fastify.get('/pending', { preHandler: fastify.authenticate()}, async (req, res) => {
        const currentUserId = req.user!.id;
        const db = await getDB();
        try {
            const friends = await db.all('SELECT * FROM friendships WHERE requester_id = ? AND status = ?', [currentUserId , 'pending']);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { friends }
            });
        } catch (err: any) {
            console.error('Error fetching friends:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to fetch friends' }
            });
        }
    });

    // show received friend requests (sent to current user)
    fastify.get('/requests', { preHandler: fastify.authenticate()}, async (req, res) => {
        const currentUserId = req.user!.id;
        const db = await getDB();
        try {
            const requests = await db.all(`
                SELECT f.id, f.requester_id, f.created_at, u.username, u.avatar_url
                FROM friendships f
                JOIN users u ON f.requester_id = u.id
                WHERE f.addressee_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `, [currentUserId]);
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { requests }
            });
        } catch (err: any) {
            console.error('Error fetching friend requests:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to fetch friend requests' }
            });
        }
    });

    // Remove friend
    fastify.delete('/remove/:friendId', { preHandler: fastify.authenticate()}, async (req, res) => {
        const { friendId } = req.params as { friendId: string };
        const currentUserId = req.user!.id;
        const db = await getDB();
        try {
            const friendship = await db.get(`
                SELECT * FROM friendships WHERE
                (requester_id = ? AND addressee_id = ?)
                OR (requester_id = ? AND addressee_id = ?)
            `, [currentUserId, friendId, friendId, currentUserId]);
            if (!friendship) {
                return res.code(StatusCodes.NOT_FOUND).send({
                    success: false,
                    details: { error: 'Friendship not found' }
                });
            }
            if (friendship.blocker_id) {
                return res.code(StatusCodes.BAD_REQUEST).send({
                    success: false,
                    details: { error: 'Cannot remove a blocked user. Unblock them first.' }
                });
            }
            await db.run('DELETE FROM friendships WHERE id = ?', [friendship.id]);
            const friend = (await UserModel.findByField("id", friendId))!;
            friend.sendViaWs({
                type: "friend_removed",
                id: currentUserId
            });
            return res.code(StatusCodes.OK).send({
                success: true,
                details: { message: 'Friend removed successfully' }
            });
        } catch (err: any) {
            console.error('Error removing friend:', err);
            return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
                success: false,
                details: { error: 'Failed to remove friend' }
            });
        }
    });

	fastify.get("/search/:username", { preHandler: fastify.authenticate() }, async (req, res) => {
	  const { username } = req.params as { username: string };
	  const currentUserId = req.user!.id;
	  const db = await getDB();
	  try {
	    const users = await db.all(
	      `SELECT u.id,
	              u.username,
	              u.avatar_url,
	              COALESCE(f.status, 'none') AS status
	       FROM users u
	       LEFT JOIN friendships f
	         ON (
	           (f.requester_id = ? AND f.addressee_id = u.id)
	           OR
	           (f.addressee_id = ? AND f.requester_id = u.id)
	         )
	       WHERE u.username LIKE ?
	         AND u.id != ?
	       LIMIT 10`,
	      [currentUserId, currentUserId, `%${username}%`, currentUserId]
	    );

	    return res.code(StatusCodes.OK).send({
	      success: true,
	      message: 'Users fetched successfully',
	      details: users
	    });
	  } catch (err: any) {
	    console.error('Error searching users:', err);
	    return res.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
	      success: false,
	      details: { error: 'Failed to search users' }
	    });
	  }
	});

    fastify.get("/online", {preHandler: fastify.authenticate()}, async (req, res) => {
        const {id} = req.user;
        const friends = await getOnlineFriends(id);
        return res.code(StatusCodes.OK).send(getSuccessMsg({details: {friends}}));
    });
}
