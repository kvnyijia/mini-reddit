import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from "express";
import { expressMiddleware } from '@apollo/server/express4';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
// import { typeDefs, resolvers } from './schema';
import { MyContext } from "./types"
import { __prod__ } from "./constants";
import microConfig from "./mikro-orm.config"
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { buildTypeDefsAndResolvers } from "type-graphql";

const main = async () => {
  console.log('\n>>> ---------------------------------------------\n');
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  // await orm.getMigrator().down();

  // const post = orm.em.fork({}).create(Post, {title: "my 3rd post"});
  // await orm.em.fork({}).persistAndFlush(post);

  // const allposts = await orm.em.fork({}).find(Post, {});
  // console.log(allposts);

  // Generate the GraphQL schema: Create typeDefs and resolvers map k 
  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [HelloResolver, PostResolver, UserResolver],
  });

  const app = express();
  const httpServer = http.createServer(app);
  const apolloServer = new ApolloServer<MyContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  //   schema: await buildSchema({
  //     resolvers: [HelloResolver, PostResolver],
  //     validator: false,
  //   }), 
  //   context: () => ({ em: orm.em }),
  });
  await apolloServer.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(apolloServer, {
      context: async () => ({ em: orm.em }),
    }),
  );
  
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`\n>>> Server ready at http://localhost:4000/graphql\n`);

  // apolloServer.applyMiddleware({ app });
  // app.get("/", (req, res) => {
  //   res.send("hello");
  // });
  // app.listen(4000, () => {
  //   console.log(">>> server started in localhost:4000");
  // });

};

main().catch((err) => {
  console.error(err);
});  