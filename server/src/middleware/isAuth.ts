import { MyContext } from "src/types";
import { Middleware } from "type-graphql/dist/interfaces/Middleware";

export const isAuth: Middleware<MyContext> = ({ context }, next) => {
  if (!context.req.session.userid) {
    throw new Error("not authenticated");
  }
  return next();
};
