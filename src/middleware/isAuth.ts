import { MyContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

// A middleware is run before ur resolvers
export const isAuth: MiddlewareFn<MyContext> = ({context}, next) => {
  if (!context.req.session.userId) {
    throw new Error("Not login");
  }
  return next();
};
