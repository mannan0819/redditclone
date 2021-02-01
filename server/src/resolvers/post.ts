import { Post } from "../entities/post";
import {
  Resolver,
  Query,
  Arg,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
  FieldResolver,
  Root,
} from "type-graphql";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { Connection, getConnection } from "typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @Query(() => [Post])
  posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string
  ): Promise<Post[]> {
    const realLimit = Math.min(limit, 50);
    const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("post")
      .take(realLimit)
      .orderBy('"createdAt"', "DESC");

    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(cursor) });
    }
    return qb.getMany();
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne({ where: { id } });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userid,
    }).save();
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<Boolean> {
    await Post.delete(id);
    return true;
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) return null;
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title });
    }
    return post;
  }
}
