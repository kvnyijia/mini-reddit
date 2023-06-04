import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from "express";
import { expressMiddleware } from '@apollo/server/express4';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { MyContext } from "./types"
import { __prod__ } from "./constants";
import microConfig from "./mikro-orm.config"
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { buildTypeDefsAndResolvers } from "type-graphql";

// import RedisStore from "connect-redis";
import session from "express-session";
// import { createClient } from "redis";
import Redis from "ioredis";
// import { sendEmail } from "./utils/sendEmail";
// import { User } from "./entities/User";
// import connectRedis from 'connect-redis';

const main = async () => {
  console.log('\n>>> ---------------------------------------------\n');
  // sendEmail("bob@bob.com", "hello this is email content");
  const orm = await MikroORM.init(microConfig);
  // await orm.em.nativeDelete(User, {});
  await orm.getMigrator().up();
  // await orm.getMigrator().down();

  // Generate the GraphQL schema: Create typeDefs and resolvers map k 
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
  // app.set("Access-Control-Allow-Origin", "http://localhost:3000");
  // app.set("Access-Control-Allow-Credentials", true);
  // app.set('trust proxy', !__prod__);

  // Initialize client.
  // const redisClient = createClient();
  // redisClient.on('error', err => console.log('Redis Client Error', err));
  // await redisClient.connect();
  // redisClient.connect().catch(console.error);
  const redis = new Redis();

  // Initialize store.
  // const RedisStore = connectRedis(session);
  const RedisStore = require("connect-redis").default;
  const redisStore = new RedisStore({
    client: redis,
    // prefix: "myapp:",
    disableTouch: true,
  });

  // Initialize sesssion storage.
  app.use(
    session({
      name: "myCookie",
      store: redisStore,
      resave: false, // required: force lightweight session keep alive (touch)
      saveUninitialized: false, // recommended: only save session when data exists
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
      context: async ({ req, res }): Promise<MyContext> => ({ em: orm.em, req, res, redis }),
    }),
  );
  
  app.get("/", (req, res) => {
    // res.send("hello");
    // res.send(JSON.stringify({message: "hello world"}))
    res.send(JSON.stringify(["apple", "banana", "canada"]))
  });
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`\n>>> Server ready at http://localhost:4000/graphql\n`);
};

main().catch((err) => {
  console.error(err);
});  