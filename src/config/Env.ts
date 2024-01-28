import dotenv from 'dotenv';                    // Needed by process.env
dotenv.config();                                // Needed by process.env

export const REDIS_SECRET = process.env.REDIS_SECRET;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
export const PORT = process.env.PORT || 4000;
