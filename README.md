
## Prerequisites

Installing all dependencies
```bash
yarn install
```

Set up Postgres DB, and config `AppDataSource` in `index.ts`

Set up Redis Store

## How to Run Locally

Firstly, generate js files from ts files
```bash
yarn watch
```
then in another terminal
```bash
yarn start
```
then [Apollo Server](https://www.apollographql.com/docs/apollo-server/) and GraphQL endpoints will be running on http://localhost:4000/graphql 
