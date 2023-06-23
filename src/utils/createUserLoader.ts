import DataLoader from "dataloader";
import { User } from "../entities/User";
import { In } from "typeorm";

/**
 * @param userIds: list of userId [1,4,6,7]
 * @returns list of User objects corresponding to that userId [{}, {}, {}, {}]
 */
export const createUserLoader = () => new DataLoader<number, User>(async (userIds) => {
  const users = await User.findBy({id: In(userIds as number[])});
  const userIdToUser: Record<number, User> = {};
  users.forEach((user) => {
    userIdToUser[user.id] = user;
  });
  return userIds.map((userId) => userIdToUser[userId]);
});
