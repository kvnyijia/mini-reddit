import dotenv from 'dotenv';                    // Needed by process.env
dotenv.config();                                // Needed by process.env

export const Env = {
  REDIS_SECRET:  process.env.REDIS_SECRET || 'change this',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  PORT: process.env.PORT || 4000,
};

