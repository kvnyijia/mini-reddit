import { Post } from "../entities/Post";
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../";
import { Updoot } from "../entities/Updoot";

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
        p.*, 
        json_build_object(
          'id', u.id,
          'username', u.username,
          'email', u.email,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) creator
      from post p join "user" u on u."id" = p."creatorId" 
      ${cursor ? `where p."createdAt" < $2` : ""}
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