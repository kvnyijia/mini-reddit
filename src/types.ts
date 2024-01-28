import { Request, Response } from "express";
import { Redis } from "ioredis";
import { Session } from "express-session";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";
// import { ParamsDictionary } from 'express-serve-static-core';

declare interface ISession extends Session {
  userId?: number;
}

export type MyContext = {
  req: Request & { session: ISession };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createUpdootLoader>;
};

// Define Types for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_PORT: number;
      DB_USERNAZME: string;
      DB_PASSWORD: string;
      PORT: number;
    }
  }
}
