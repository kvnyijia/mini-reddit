import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { buildSchema } from "graphql";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config"
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";


const main = async () => {
  console.log('>>> ---------------------------------------------\n\n');
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  // await orm.getMigrator().down();

  // const post = orm.em.fork({}).create(Post, {title: "my 3rd post"});
  // await orm.em.fork({}).persistAndFlush(post);

  // const allposts = await orm.em.fork({}).find(Post, {});
  // console.log(allposts);


  const app = express();

  // const apolloServer = new ApolloServer({
  //   schema: await buildSchema({
  //     resolvers: [HelloResolver, PostResolver],
  //     validator: false,
  //   }), 
  //   context: () => ({ em: orm.em }),
  // });
  // apolloServer.applyMiddleware({ app });
  app.get("/", (req, res) => {
    res.send("hello");
  });
  app.listen(4000, () => {
    console.log(">>> server started in localhost:4000");
  });

};

main().catch((err) => {
  console.error(err);
});  