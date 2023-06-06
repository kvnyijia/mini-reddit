import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";
import { NOT_LOGIN_ERROR_MSG } from "../constants";

// A middleware is run before ur resolvers
export const isAuth: MiddlewareFn<MyContext> = ({context}, next) => {
  if (!context.req.session.userId) {
    throw new Error(NOT_LOGIN_ERROR_MSG);
  }
  return next();
};
