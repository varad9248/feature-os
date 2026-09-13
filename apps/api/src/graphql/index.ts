import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { env } from '@feature-os/config';
import { typeDefs } from './typeDefs';
import { resolvers, GraphQLContext } from './resolvers';
import { Application, Request } from 'express';

export async function setupGraphQL(app: Application) {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }: { req: Request }): Promise<GraphQLContext> => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as any;
            return { user: decoded };
          } catch {
            return {};
          }
        }
        return {};
      },
    }),
  );

  return server;
}
