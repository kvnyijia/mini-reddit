import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from "argon2";
import { sendEmail } from "../utils/sendEmail";
import {v4} from "uuid";
import { FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { AppDataSource } from "../index";

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], {nullable: true})
  errors?: FieldError[]; 

  @Field(() => User, {nullable: true})
  user?: User; 
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse) 
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() {req, redis}: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors:[
          {
            field: "newPassword",
            message: "length must be greater than 2",
          },
        ]
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired",
          }
        ]
      };
    }
    const id = parseInt(userId);
    const user = await User.findOneBy({id});
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists",
          }
        ]
      };
    }
    user.password = await argon2.hash(newPassword);
    await User.update({id}, {password: user.password})

    // Delete token key for changePassword
    await redis.del(key);

    // log in user after changing password
    req.session.userId = user.id;
    return {user};
  }

  @Mutation(() => Boolean) 
  async forgetPassword(
    @Arg('email') email: string,
    @Ctx() {redis}: MyContext
  ): Promise<Boolean> {
    const user = await User.findOneBy({email});
    if (!user) {
      return true;
    }

    const token = v4();
    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'EX', 1000*60*60*24*3);

    await sendEmail(
      email, 
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );
    return true;
  }

  @Query(() => User, {nullable: true})
  me (
    @Ctx() {req}: MyContext
  ) {
    if (!req.session.userId) {
      return null;
    }
    return User.findOneBy({id: req.session.userId});
  }


  @Mutation(() => UserResponse) 
  async register(
    @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() {req}: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return {errors};
    }

    const hashedPassword = await argon2.hash(options.password);
    // Might encounter duplicate username
    let user;
    try {
      // User.create({}).save();
      const result = await AppDataSource
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning("*")
        .execute();
      // console.log("register result = ", result);
      user = result.raw[0];
    } catch (err) {
      if (err.code === '23505' || err.detail.includes("already exisits")) {
        return {
          errors: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
      }
      console.log("message: ", err.message);
    }
    req.session.userId = user.id;
    return {user};
  }

  @Mutation(() => UserResponse) 
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() {req}: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOneBy(
      usernameOrEmail.includes("@") 
        ? {email: usernameOrEmail}
        : {username: usernameOrEmail}
    );
    if (!user) {
      return {
        errors: [{
          field: 'usernameOrEmail',
          message: 'that username or email does not exist',
        }],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{
          field: 'password',
          message: 'that password is incorrect',
        }],
      };
    }
    
    req.session.userId = user.id;
    // await em.persistAndFlush(user);
    return {user};
  }

  @Mutation(() => Boolean) 
  logout(
    @Ctx() {req, res}: MyContext
  ) {
    return new Promise((resolve) => 
      req.session.destroy(err => {
        res.clearCookie('myCookie');

        if (err) {
          console.log(err);
          resolve(false)
          return 
        }
        resolve(true)
      })
    );
  }
}