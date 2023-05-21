
// Schema definition
export const typeDefs = `#graphql
  type numberSix {
    num: Int
  }

  type Book {
    title: String
    author: String
  }

  type Query {
    sayHello: String
    getNumberSix: numberSix
  }
`;

// Resolver map
export const resolvers = {
  Query: {
    sayHello() {
      return "hello ;)";
    },
    getNumberSix() {
      return {num: 6};
    },
  },
};