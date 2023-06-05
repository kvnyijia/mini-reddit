import { Request, Response } from "express";
import { Redis } from "ioredis";
import { Session } from "express-session";
// import { ParamsDictionary } from 'express-serve-static-core';

declare interface ISession extends Session {
  userId?: number;
}

export type MyContext = {
  req: Request & { session: ISession };
  res: Response;
  redis: Redis;
};
