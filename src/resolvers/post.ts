import { Post } from "../entities/Post";
import { Arg, Ctx, Field, InputType, Int, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
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

@Resolver()
export class PostResolver {
  @Query(() => [Post]) 
  posts(
    @Arg('limit', () => Int) limit: number, 
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<Post[]> {
    const realLimit = Math.min(50, limit);
    const qb = AppDataSource
      .getRepository(Post)
      .createQueryBuilder("p")
      .orderBy('"createdAt"', 'DESC')
      .take(realLimit);
    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) });
    }

    return qb.getMany();
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