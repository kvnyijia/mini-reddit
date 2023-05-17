import { MikroORM } from "@mikro-orm/core"
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config"

const main = async () => {
  console.log('---------------------------------------------\n\n');
  const orm = await MikroORM.init(microConfig);
  // await orm.getMigrator().up();
  // await orm.getMigrator().down();

  // const post = orm.em.fork({}).create(Post, {title: "my first post"});
  // await orm.em.fork({}).persistAndFlush(post);

  const allposts = await orm.em.fork({}).find(Post, {});
  console.log(allposts);
};

main().catch((err) => {
  console.error(err);
});  