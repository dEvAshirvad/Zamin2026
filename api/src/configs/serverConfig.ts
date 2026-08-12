import type { Express, NextFunction, Request, Response, Router } from 'express';

import { apiReference } from '@scalar/express-api-reference';
import { toNodeHandler } from 'better-auth/node';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';

import { getMongoStatus } from '@/configs/db/mongodb';
import { checkRedisReadiness, getRedisStatus } from '@/configs/db/redis';
import env from '@/configs/env';
import APIError from '@/configs/errors/APIError';
import { CORE_ERRORS } from '@/configs/errors/CORE_ERRORS';
import { getMetricsSnapshot } from '@/configs/metrics';
import origins from '@/configs/origins';
import {
  authLimiter,
  globalLimiter,
  mutationLimiter,
  uploadLimiter,
} from '@/configs/rate-limit';
import swaggerSpec from '@/configs/swagger';
import { auth } from '@/lib/auth';
import { runWithRequestContext } from '@/lib/request-context';
import Respond from '@/lib/respond';
import auditTrail from '@/middleware/audit-trail';
import { errorHandler } from '@/middleware/error-handler';
import idempotencyMiddleware from '@/middleware/idempotency';
import metricsMiddleware from '@/middleware/metrics';
import mongoSanitizeExpress5 from '@/middleware/mongo-sanitize-express5';
import requestTimeoutMiddleware from '@/middleware/request-timeout';
import { requestLogger } from '@/middleware/requestLogger';
import serveEmojiFavicon from '@/middleware/serveEmojiFavicon';
import router from '@/modules';

const logo = readFileSync(
  path.resolve(process.cwd(), 'public/logo.svg'),
  'utf8',
);

export { authLimiter, mutationLimiter, uploadLimiter };

export function createRouter(): Router {
  return express.Router();
}

function hasInternalAccess(req: Request): boolean {
  if (env.NODE_ENV === 'development') {
    return true;
  }

  const internalToken = env.INTERNAL_API_TOKEN?.trim();
  if (!internalToken) {
    return true;
  }
  const providedToken = req.header('x-internal-token')?.trim();
  return Boolean(providedToken && providedToken === internalToken);
}

async function readinessHandler(_req: Request, res: Response) {
  const mongo = getMongoStatus();
  const redis = getRedisStatus();
  const redisReadiness = await checkRedisReadiness();
  const isReady
    = mongo.mongooseConnected
      && mongo.nativeConnected
      && redis.isReady
      && redisReadiness.isReady;

  Respond(
    res,
    {
      status: isReady ? 'ready' : 'not_ready',
      dependencies: {
        mongo,
        redis: {
          ...redis,
          ping: redisReadiness,
        },
      },
    },
    isReady ? 200 : 503,
  );
}

export default function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(globalLimiter);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        }
        else {
          callback(
            new APIError({
              ...CORE_ERRORS.CORS_FORBIDDEN,
            }),
          );
        }
      },
    }),
  );

  app.use(requestLogger);

  app.all('/api/auth/*splat', authLimiter, toNodeHandler(auth));

  app.set(
    'trust proxy',
    env.TRUST_PROXY_HOPS > 0 ? env.TRUST_PROXY_HOPS : false,
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://cdn.jsdelivr.net',
          ],
          'style-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://cdn.jsdelivr.net',
          ],
          'img-src': ['\'self\'', 'data:', 'https:'],
          'font-src': ['\'self\'', 'https://cdn.jsdelivr.net', 'data:'],
          'connect-src': ['\'self\''],
          'worker-src': ['\'self\'', 'blob:'],
        },
      },
    }),
  );
  app.use(hpp());
  app.use(mongoSanitizeExpress5());
  app.use(cookieParser());

  app.use((req, res, next) => {
    const requestId
      = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    runWithRequestContext(requestId, () => next());
  });

  app.use(requestTimeoutMiddleware);
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(metricsMiddleware);
  app.use(serveEmojiFavicon({ svg: logo }));

  app.get('/', (_req, res) => {
    Respond(
      res,
      {
        message: 'projectZamin API services are running.',
        nodeEnv: env.NODE_ENV,
        uptime: process.uptime(),
      },
      200,
    );
  });

  const livenessHandler = (_req: Request, res: Response) => {
    Respond(res, { status: 'ok', uptime: process.uptime() }, 200);
  };

  app.get('/health', livenessHandler);
  app.get('/healthz', livenessHandler);

  app.get('/ready', async (req, res) => {
    if (!hasInternalAccess(req)) {
      return Respond(
        res,
        { status: 'forbidden', message: 'Internal token required.' },
        403,
      );
    }
    return readinessHandler(req, res);
  });

  app.get('/readyz', readinessHandler);

  app.get('/docs/openapi.json', (req, res) => {
    if (!hasInternalAccess(req)) {
      return Respond(
        res,
        { status: 'forbidden', message: 'Internal token required.' },
        403,
      );
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json(swaggerSpec);
  });

  app.use(
    '/docs/swagger',
    (req: Request, res: Response, next: NextFunction) => {
      if (!hasInternalAccess(req)) {
        return Respond(
          res,
          { status: 'forbidden', message: 'Internal token required.' },
          403,
        );
      }
      return next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { explorer: true }),
  );

  app.use(
    '/docs/scalar',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      if (!hasInternalAccess(req)) {
        return Respond(
          res,
          { status: 'forbidden', message: 'Internal token required.' },
          403,
        );
      }
      return next();
    },
    apiReference({
      url: '/docs/openapi.json',
      theme: 'purple',
      pageTitle: 'projectZamin API Reference',
    }),
  );

  app.get('/metrics', (req, res) => {
    if (!hasInternalAccess(req)) {
      return Respond(
        res,
        { status: 'forbidden', message: 'Internal token required.' },
        403,
      );
    }
    return Respond(res, getMetricsSnapshot(), 200);
  });

  app.use(
    '/api/v1',
    mutationLimiter,
    auditTrail,
    idempotencyMiddleware,
    router,
  );

  app.use((req, _res, next) => {
    next(
      new APIError({
        ...CORE_ERRORS.NOT_FOUND,
        META: {
          path: req.originalUrl,
          method: req.method,
        },
      }),
    );
  });

  app.use(errorHandler);
  return app;
}
