import path from "path";
import { Post } from "../entities/Post";
import { Updoot } from "../entities";
import { User } from "../entities";
// import { User, Post, Updoot } from "../entities";
import { DataSource } from "typeorm";
import dotenv from 'dotenv';                    // Needed by process.env
dotenv.config();                                // Needed by process.env

const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: "postgres",
  logging: true,
  synchronize: true,
  entities: [Post, User, Updoot],
  migrations: [path.join(__dirname, "./migrations/*")],
});
