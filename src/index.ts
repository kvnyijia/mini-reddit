import "reflect-metadata";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from "express";
import { expressMiddleware } from '@apollo/server/express4';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { MyContext } from "./types"
import { __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { buildTypeDefsAndResolvers } from "type-graphql";
import session from "express-session";
import Redis from "ioredis";
import RedisStore from "connect-redis"
import { createUserLoader } from "./utils/createUserLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { AppDataSource, Env } from "./config";

async function main() {

  // DB migration
  AppDataSource.initialize()
    .then(async () => {
      await AppDataSource.runMigrations();
      console.log(">>> DB Migration is up!")
      // await Post.delete({});
      // console.log(">>> posts deleted");
    })
    .catch((err) => {
      console.error("Error during Data Source initialization", err)
    });

  // Create redis (redis client)(using ioredis) & redisStore (using connect-redis)
  const redis = new Redis();
  const redisStore = new RedisStore({
    client: redis,
    // prefix: "myapp:",
    disableTouch: true,
  });

  const app = express();
  app.use(
    cors({
      origin: Env.CLIENT_ORIGIN, 
      credentials: true,
    })
  );
  // Initialize redis sesssion storage
  app.use(
    session({
      name: "myCookie",
      store: redisStore,
      resave: false,                               // required: force lightweight session keep alive (touch)
      saveUninitialized: false,                    // recommended: only save session when data exists
      secret: Env.REDIS_SECRET,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax',
        secure: __prod__,
      },
    })
  );

  // Generate the GraphQL schema (using TypeGraphQL): Create a `typeDefs` and `resolvers`(map) pair
  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [HelloResolver, PostResolver, UserResolver],
  });
  const httpServer = http.createServer(app);
  const apolloServer = new ApolloServer<MyContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await apolloServer.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: [Env.CLIENT_ORIGIN], credentials: true, }),
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }): Promise<MyContext> => ({ req, res, redis, userLoader: createUserLoader(), updootLoader: createUpdootLoader(), }),
    }),
  );
  
  await new Promise<void>((resolve) => httpServer.listen({ port: Env.PORT }, resolve));
  console.log(`\n>>> Server ready at http://localhost:${Env.PORT}/graphql\n`);
};

main().catch((err) => {
  console.error(err);
});
