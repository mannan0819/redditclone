import { UsernamePasswordInput } from "./EmailOrUsernamePasswordInput";

export const validate = (options: UsernamePasswordInput) => {
  if (!options.email.includes("@")) {
    return [
      {
        field: "email",
        message: "Not a valid email address",
      },
    ];
  }

  if (options.username.length <= 2) {
    return [
      {
        field: "username",
        message: "the username has to be at least 3 characters long",
      },
    ];
  }
  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "the username cant include @",
      },
    ];
  }
  if (options.password.length <= 3) {
    return [
      {
        field: "password",
        message: "the password has to be at least 4 characters long",
      },
    ];
  }
  return null;
};
