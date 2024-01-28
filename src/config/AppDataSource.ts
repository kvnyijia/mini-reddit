import path from "path";
import { User, Post, Updoot } from "../entities";
import { DataSource } from "typeorm";
import dotenv from 'dotenv';                    // Needed by process.env
dotenv.config();                                // Needed by process.env

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USERNAME = process.env.DB_USERNAME || 'username';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';

export const AppDataSource = new DataSource({
  type: "postgres",
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: "postgres",
  logging: true,
  synchronize: true,
  entities: [Post, User, Updoot],
  migrations: [path.join(__dirname, "./migrations/*")],
});
