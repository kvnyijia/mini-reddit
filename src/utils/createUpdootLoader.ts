import DataLoader from "dataloader";
import { In } from "typeorm";
import { Updoot } from "../entities/Updoot";

/**
 * @param keys: list of {userIds, postId} object, e.g. [{10, 1},{10, 4},{10, 6},{10, 7}]
 * @returns list of Updoot objects corresponding to that {userIds, postId} object [{}, {}, {}, {}]
 */
export const createUpdootLoader = () => 
  new DataLoader<{postId: number; userId: number}, Updoot | null>(
    async (keys) => {
      let listOfUserId = keys.map((k) => k.userId);
      let listOfPostId = keys.map((k) => k.postId);
      const updoots = await Updoot.findBy({userId: In(listOfUserId), postId: In(listOfPostId)});
      const updootIdToUpdoot: Record<string, Updoot> = {};
      updoots.forEach((key) => {
        updootIdToUpdoot[`${key.userId}|${key.postId}`] = key;
      });
      return keys.map((key) => updootIdToUpdoot[`${key.userId}|${key.postId}`]);
    }
  );
