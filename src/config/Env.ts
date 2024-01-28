import dotenv from 'dotenv';                    // Needed by process.env
dotenv.config();                                // Needed by process.env

export const Env = {
  REDIS_SECRET:  process.env.REDIS_SECRET,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  PORT: process.env.PORT || 4000,
};

