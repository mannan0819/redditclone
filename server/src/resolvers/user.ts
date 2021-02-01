import { MyContext } from "src/types";
import {
  Resolver,
  Query,
  Ctx,
  Mutation,
  Field,
  Arg,
  ObjectType,
} from "type-graphql";
import argon2 from "argon2";
import { User } from "../entities/User";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { validate } from "../util/validate";
import { UsernamePasswordInput } from "../util/EmailOrUsernamePasswordInput";
import { v4 } from "uuid";
import { sendEmail } from "../util/mailer";

@ObjectType()
class FieldError {
  @Field()
  field: String;

  @Field()
  message: String;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  error?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext): Promise<User | undefined> {
    return await User.findOne({ where: { id: req.session.userid } });
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("newPassword") newPassword: string,
    @Arg("token") token: string,
    @Ctx() { req, redis }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return {
        error: [
          {
            field: "newPassword",
            message: "the password has to be at least 4 characters long",
          },
        ],
      };
    }
    const userid = await redis.get(FORGOT_PASSWORD_PREFIX + token);
    if (!userid) {
      return {
        error: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }
    const userIdNum = parseInt(userid);
    const user = await User.findOne({ where: { id: userIdNum } });
    if (!user) {
      return {
        error: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    );

    //user login and delete token
    await redis.del(FORGOT_PASSWORD_PREFIX + token);
    req.session.userid = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return true;
    } else {
      const token = v4();
      console.log(token);
      await redis.set(
        FORGOT_PASSWORD_PREFIX + token,
        user.id,
        "ex",
        1000 * 60 * 60 * 24 * 3
      ); //3 days
      await sendEmail(
        user.email,
        `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
      );
      return true;
    }
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    //Validating Fields
    const error = validate(options);
    if (error) return { error };
    console.log(options.email);
    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      user = await User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      }).save();
    } catch (err) {
      //dupilate user
      if (err.code === "23505") {
        return {
          error: [
            {
              field: "username",
              message: "user already exists",
            },
          ],
        };
      }
      console.log("message: ", err.message);
    }

    if (user) req.session.userid = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const usr = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );

    if (!usr) {
      return {
        error: [
          {
            field: "username",
            message: "this user does not exist",
          },
        ],
      };
    }
    if (!(await argon2.verify(usr.password, password))) {
      return {
        error: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }
    req.session.userid = usr.id;
    return { user: usr };
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    return await User.find();
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    console.log("HERERR");
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
