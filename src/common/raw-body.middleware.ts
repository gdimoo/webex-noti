import { Request, Response, NextFunction } from 'express';
import getRawBody from 'raw-body';

export async function rawBodyMiddleware(
    req: Request & { rawBody?: Buffer },
    _res: Response,
    next: NextFunction,
) {
    if (req.url.startsWith('/webex/webhook') && req.method === 'POST') {
        try {
            req.rawBody = await getRawBody(req);
            next();
        } catch (e) {
            next(e);
        }
    } else {
        next();
    }
}
