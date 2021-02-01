import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/post";
import path from "path";
// import { mailer } from "./util/mailer";

const RedisStore = connectRedis(session);
const redis = new Redis();

const main = async () => {
  //mailer("bob@bob.com", "Hello FROM ME :)");
  //const orm = await MikroORM.init(mikroOrmConfig);
  const conn = await createConnection({
    type: "postgres",
    username: "postgres",
    password: "postgres",
    database: "redditclone2",
    logging: true,
    entities: [User, Post],
    //  migrations: [path.join(__dirname, "/migrations/*")],
    synchronize: true,
  });
  //await conn.runMigrations();
  const app = express();
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 2,
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: "asdfk98sdaf3j2sdnfskalfjweid",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log("Server started on localHost:4000");
  });
};

main();
console.log("Hello there");

// const post = orm.em.create(Post, {title: "First Post"});
// await orm.em.persistAndFlush(post);

//  const allPosts = await orm.em.find(Post,{})
//  console.log(allPosts);

//await orm.getMigrator().up;
// await orm.em.nativeDelete(User, {});

// const allPosts = await orm.em.find(Post, {});
// console.log(allPosts);
