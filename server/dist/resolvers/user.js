"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = void 0;
const type_graphql_1 = require("type-graphql");
const argon2_1 = __importDefault(require("argon2"));
const User_1 = require("../entities/User");
const constants_1 = require("../constants");
const validate_1 = require("../util/validate");
const EmailOrUsernamePasswordInput_1 = require("../util/EmailOrUsernamePasswordInput");
const uuid_1 = require("uuid");
const mailer_1 = require("../util/mailer");
let FieldError = class FieldError {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    type_graphql_1.ObjectType()
], FieldError);
let UserResponse = class UserResponse {
};
__decorate([
    type_graphql_1.Field(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], UserResponse.prototype, "error", void 0);
__decorate([
    type_graphql_1.Field(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], UserResponse.prototype, "user", void 0);
UserResponse = __decorate([
    type_graphql_1.ObjectType()
], UserResponse);
let UserResolver = class UserResolver {
    me({ req }) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.User.findOne({ where: { id: req.session.userid } });
        });
    }
    changePassword(newPassword, token, { req, redis }) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const userid = yield redis.get(constants_1.FORGOT_PASSWORD_PREFIX + token);
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
            const user = yield User_1.User.findOne({ where: { id: userIdNum } });
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
            yield User_1.User.update({ id: userIdNum }, { password: yield argon2_1.default.hash(newPassword) });
            yield redis.del(constants_1.FORGOT_PASSWORD_PREFIX + token);
            req.session.userid = user.id;
            return { user };
        });
    }
    forgotPassword(email, { redis }) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.User.findOne({ where: { email } });
            if (!user) {
                return true;
            }
            else {
                const token = uuid_1.v4();
                console.log(token);
                yield redis.set(constants_1.FORGOT_PASSWORD_PREFIX + token, user.id, "ex", 1000 * 60 * 60 * 24 * 3);
                yield mailer_1.sendEmail(user.email, `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`);
                return true;
            }
        });
    }
    register(options, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const error = validate_1.validate(options);
            if (error)
                return { error };
            console.log(options.email);
            const hashedPassword = yield argon2_1.default.hash(options.password);
            let user;
            try {
                user = yield User_1.User.create({
                    username: options.username,
                    email: options.email,
                    password: hashedPassword,
                }).save();
            }
            catch (err) {
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
            if (user)
                req.session.userid = user.id;
            return { user };
        });
    }
    login(usernameOrEmail, password, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const usr = yield User_1.User.findOne(usernameOrEmail.includes("@")
                ? { where: { email: usernameOrEmail } }
                : { where: { username: usernameOrEmail } });
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
            if (!(yield argon2_1.default.verify(usr.password, password))) {
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
        });
    }
    users() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.User.find();
        });
    }
    logout({ req, res }) {
        console.log("HERERR");
        return new Promise((resolve) => req.session.destroy((err) => {
            res.clearCookie(constants_1.COOKIE_NAME);
            if (err) {
                console.log(err);
                resolve(false);
                return;
            }
            resolve(true);
        }));
    }
};
__decorate([
    type_graphql_1.Query(() => User_1.User, { nullable: true }),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "me", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg("newPassword")),
    __param(1, type_graphql_1.Arg("token")),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "changePassword", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Arg("email")),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "forgotPassword", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg("options")),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailOrUsernamePasswordInput_1.UsernamePasswordInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg("usernameOrEmail")),
    __param(1, type_graphql_1.Arg("password")),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    type_graphql_1.Query(() => [User_1.User]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "users", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "logout", null);
UserResolver = __decorate([
    type_graphql_1.Resolver()
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=user.js.map