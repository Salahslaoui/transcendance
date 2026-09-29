import {checkIfFriends} from "../database/relationships/friends.db";
import UserModel, { User } from "../database/user/user.db";
import { WebsocketService } from "./wsUtils";



export function getSuccessMsg(data: object) {
    return ({success: true, details: data});
}


export async function getOnlineFriends(id: number) {
  const allUsers = Array.from(WebsocketService.getAllWs().keys());
  const friendChecks = await Promise.all(
    allUsers.map(userId => checkIfFriends(id, userId))
  );
  const friendIds = allUsers.filter((_, idx) => friendChecks[idx]);

  const userObjs = await Promise.all(
    friendIds.map(async friendId => {
      const user = await UserModel.findByField("id", friendId);
      return user?.getSharableInfo();
    })
  );
  return userObjs.filter(Boolean);
}
