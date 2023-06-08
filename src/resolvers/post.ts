import { Post } from "../entities/Post";
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../";

@InputType() 
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(
    @Root() root: Post
  ) {
    return root.text.slice(0, 50);
  }

  @Query(() => PaginatedPosts) 
  async posts(
    @Arg('limit', () => Int) limit: number, 
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    let replacements: any[] = [realLimitPlusOne];
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }
    const posts = await AppDataSource.query(`
      select 
        p.*, 
        json_build_object(
          'id', u.id,
          'username', u.username,
          'email', u.email,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) creator
      from post p join "user" u on u."id" = p."creatorId" 
      where ${cursor ? `p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
      `, replacements
    );
    // console.log(posts);

    // const qb = AppDataSource
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect(
    //     "p.creator",
    //     "u",
    //     'u.id = p."creatorId"',
    //   )
    //   .orderBy('p."createdAt"', 'DESC')
    //   .take(realLimitPlusOne);
    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) });
    // }
    // const posts = await qb.getMany();
    return {posts: posts.slice(0, realLimit), hasMore: posts.length === realLimitPlusOne};
  }

  @Query(() => Post, {nullable: true}) 
  post(
    @Arg('id') id: number,
  ): Promise<Post|null> {
    return Post.findOneBy({id});
  }

  @Mutation(() => Post) 
  @UseMiddleware(isAuth)
  createPost(
    @Arg('input') input: PostInput,
    @Ctx() {req}: MyContext
  ): Promise<Post> {
    return Post.create({...input, creatorId: req.session.userId}).save();
  }

  @Mutation(() => Post, {nullable: true}) 
  async updatePost(
    @Arg('id', () => Int) id: number,
    @Arg('title', () => String, {nullable: true}) title: string,
  ): Promise<Post | null> {
    const post = await Post.findOneBy({id});
    if (!post) {
      return null;
    }
    if (typeof title !== "undefined") {
      await Post.update({id}, {title});
    }    
    return post;
  }

  @Mutation(() => Boolean) 
  async deletePost(
    @Arg('id', () => Int) id: number,
  ): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}