
## Prerequisites

Installing all dependencies
```bash
yarn install
```

Set up Postgres DB, and add `.env` file as the following, in order to config setting in  `AppDataSource.ts` & `index.ts`

```
# Database
DB_PORT=your_db_port
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# Application Port - server listens on this port
PORT=your_port
```

Set up Redis Store

## How to Run Locally

Firstly, generate js files in dist/ from ts files in src/
```bash
yarn watch
```
then in another terminal
```bash
yarn start
```
then [Apollo Server](https://www.apollographql.com/docs/apollo-server/) and GraphQL endpoints will be running on the port you designated, like http://localhost:4000/graphql 
