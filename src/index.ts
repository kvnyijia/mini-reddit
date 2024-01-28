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
const RedisStore = require("connect-redis").default;   // import RedisStore from "connect-redis";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import AppDataSource from "./config/AppDataSource";

const main = async () => {
  console.log('\n>>> ---------------------------------------------\n');

  // DB migration
  AppDataSource.initialize()
    .then(async () => {
      console.log(">>> Data Source has been initialized!")

      await AppDataSource.runMigrations();
      console.log(">>> DB Migration is up!")

      // await Post.delete({});
      // console.log(">>> posts deleted");
    })
    .catch((err) => {
      console.error("Error during Data Source initialization", err)
    });

  // Generate the GraphQL schema: Create a `typeDefs` and `resolvers`(map) pair
  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [HelloResolver, PostResolver, UserResolver],
  });

  const app = express();
  app.use(
    cors({
      origin: "http://localhost:3000", 
      credentials: true,
    })
  );

  // Create redis (redis client) & redisStore
  const redis = new Redis();
  const redisStore = new RedisStore({
    client: redis,
    // prefix: "myapp:",
    disableTouch: true,
  });

  // Initialize redis sesssion storage
  app.use(
    session({
      name: "myCookie",
      store: redisStore,
      resave: false,                               // required: force lightweight session keep alive (touch)
      saveUninitialized: false,                    // recommended: only save session when data exists
      secret: "keyboard cat",
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax',
        secure: __prod__,
      },
    })
  );

  const httpServer = http.createServer(app);
  const apolloServer = new ApolloServer<MyContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await apolloServer.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: ["http://localhost:3000"], credentials: true, }),
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }): Promise<MyContext> => ({ req, res, redis, userLoader: createUserLoader(), updootLoader: createUpdootLoader(), }),
    }),
  );
  
  // app.get("/", (_, res) => {
  //   res.send(JSON.stringify({message: "hello world"}))
  // });
  const port = process.env.PORT;
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  console.log(`\n>>> Server ready at http://localhost:${port}/graphql\n`);
};

main().catch((err) => {
  console.error(err);
});
