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
import { createClient } from "redis";
// import connectRedis from 'connect-redis';

const main = async () => {
  console.log('\n>>> ---------------------------------------------\n');
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  // await orm.getMigrator().down();

  // Generate the GraphQL schema: Create typeDefs and resolvers map k 
  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [HelloResolver, PostResolver, UserResolver],
  });

  const app = express();

  // Initialize client.
  const redisClient = createClient();
  // redisClient.on('error', err => console.log('Redis Client Error', err));
  // await redisClient.connect();
  redisClient.connect().catch(console.error);
  // Initialize store.
  // const RedisStore = connectRedis(session);
  const RedisStore = require("connect-redis").default;
  const redisStore = new RedisStore({
    client: redisClient,
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
    cors<cors.CorsRequest>(),  // { origin: ["https://studio.apollographql.com"], credentials: true, }
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }): Promise<MyContext> => ({ em: orm.em, req, res }),
    }),
  );
  
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`\n>>> Server ready at http://localhost:4000/graphql\n`);
};

main().catch((err) => {
  console.error(err);
});  