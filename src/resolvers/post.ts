import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../config";
import { User, Post, Updoot } from "../entities";

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

  @FieldResolver(() => User)
  creator(
    @Root() post: Post,
    @Ctx() {userLoader}: MyContext
  ) {
    return userLoader.load(post.creatorId);
    // return User.findOne({where: {id: post.creatorId}});  // Might result more SQL query when loading pages
  }

  @FieldResolver(() => Int, {nullable: true})
  async voteStatus(
    @Root() post: Post,
    @Ctx() {req, updootLoader}: MyContext
  ) {
    let updoot;
    if (req.session.userId) {
      updoot = await updootLoader.load({userId: req.session.userId, postId: post.id});
    }
    return updoot ? updoot.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote (
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() {req}: MyContext
  ) {
    const isUpdoot = value > 0;
    const realValue = isUpdoot ? 1 : -1;
    const {userId} = req.session;
    const updoot = await Updoot.findOneBy({postId, userId});

    if (updoot && updoot.value !== realValue) {
      // Create a new query runner
      const queryRunner = AppDataSource.createQueryRunner();
      // Establish real database connection using our new query runner
      await queryRunner.connect();
      // Open a new transaction
      await queryRunner.startTransaction();
      try {
        // Execute some operations on this transaction:
        await queryRunner.manager.update(Updoot, { userId, postId }, { value: realValue });
        await queryRunner.manager.increment(Post, {id: postId}, "points", 2*realValue);

        // Commit transaction
        await queryRunner.commitTransaction();
        await queryRunner.release();
      } catch (err) {
        // Since we have errors let's rollback changes we made
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        // console.log(">>> Error happens, TX has been rollbacked.");
      }
    } else if (!updoot) {
      // Create a new query runner
      const queryRunner = AppDataSource.createQueryRunner();
      // Establish real database connection using our new query runner
      await queryRunner.connect();
      // Open a new transaction
      await queryRunner.startTransaction();
      try {
        // Execute some operations on this transaction:
        await queryRunner.manager.insert(Updoot, {
          userId,
          postId,
          value: realValue, 
        });
        await queryRunner.manager.increment(Post, {id: postId}, "points", realValue);

        // Commit transaction
        await queryRunner.commitTransaction();
        await queryRunner.release();
      } catch (err) {
        // Since we have errors let's rollback changes we made
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        // console.log(">>> Error happens, TX has been rollbacked.");
      }
    }
    return true;
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
        p.*
      from 
        post p 
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
      `, replacements
    );
    return {posts: posts.slice(0, realLimit), hasMore: posts.length === realLimitPlusOne};
  }

  @Query(() => Post, {nullable: true}) 
  post(
    @Arg('id', () => Int) id: number,
  ): Promise<Post|null> {
    return Post.findOne({where: {id}});
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
    @Arg('text', () => String, {nullable: true}) text: string,
    @Ctx() {req}: MyContext
  ): Promise<Post | null> {
    const post = await AppDataSource
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', { id, creatorId: req.session.userId })
      .returning("*")
      .execute()
    return post.raw[0];
  }

  @Mutation(() => Boolean) 
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id', () => Int) id: number,
    @Ctx() {req}: MyContext
  ): Promise<boolean> {
    const post = await Post.findOne({where: {id}});
    if (!post) {
      return false;
    }
    // if (post.creatorId !== req.session.userId) {
    //   throw new Error("not authorized");
    // }
    await Updoot.delete({ postId: id })
    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
