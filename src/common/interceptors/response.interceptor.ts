import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

type AnyObject = Record<string, any>;

const API_VERSION = 'v1';
const ACCESS_TOKEN_EXPIRES_IN = 900; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 604800; // 7 days
const TIMEZONE = process.env.TIMEZONE || 'Asia/Phnom_Penh';

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? '';
}

function getTimezoneOffset(date: Date, timeZone: string): string {
    const offsetParts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const rawOffset = getPart(offsetParts, 'timeZoneName'); // Example: GMT+7
    const match = rawOffset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
        return '+00:00';
    }

    const sign = match[1];
    const hour = match[2].padStart(2, '0');
    const minute = (match[3] ?? '00').padStart(2, '0');
    return `${sign}${hour}:${minute}`;
}

function toTimezoneIso(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const year = getPart(parts, 'year');
    const month = getPart(parts, 'month');
    const day = getPart(parts, 'day');
    const hour = getPart(parts, 'hour');
    const minute = getPart(parts, 'minute');
    const second = getPart(parts, 'second');
    const offset = getTimezoneOffset(date, timeZone);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

function redactPasswords(input: any): any {
    // Format Date objects in project timezone (default Asia/Phnom_Penh)
    if (input instanceof Date) return toTimezoneIso(input, TIMEZONE);
    if (Array.isArray(input)) return input.map(redactPasswords);
    if (input && typeof input === 'object') {
        const clone: AnyObject = {};
        for (const [k, v] of Object.entries(input)) {
            if (k.toLowerCase() === 'password') continue;
            clone[k] = redactPasswords(v);
        }
        return clone;
    }
    return input;
}

function defaultMessage(path: string, method: string, data: any): string {
    const p = path.toLowerCase();
    if (p.includes('/login')) return 'Authenticated successfully';
    if (p.includes('/register')) return 'Registered successfully';
    if (p.includes('/logout')) return 'Logged out successfully';
    if (method === 'GET') return 'OK';
    if (method === 'POST') return 'Created successfully';
    if (method === 'PUT' || method === 'PATCH') return 'Updated successfully';
    if (method === 'DELETE') return 'Deleted successfully';
    return 'OK';
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, AnyObject> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<AnyObject> {
        const req = context.switchToHttp().getRequest();
        const path = (req?.originalUrl || req?.url || '').toString();
        const method = (req?.method || 'GET').toString();

        return next.handle().pipe(
            map((payload: any) => {
                // If response already follows the shape, still normalize the data
                if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
                    const shaped = payload as AnyObject;
                    return {
                        ...shaped,
                        data: redactPasswords(shaped.data),
                    } as AnyObject;
                }

                // Allow passthrough for paginated list shape: { page, pageSize, total, data }
                if (
                    payload &&
                    typeof payload === 'object' &&
                    'page' in payload &&
                    'pageSize' in payload &&
                    'total' in payload &&
                    'data' in payload
                ) {
                    const shaped = payload as AnyObject;
                    return {
                        page: shaped.page,
                        pageSize: shaped.pageSize,
                        total: shaped.total,
                        data: redactPasswords(shaped.data),
                    } as AnyObject;
                }

                // Allow passthrough for a single page object shape
                if (
                    payload &&
                    typeof payload === 'object' &&
                    'id' in payload &&
                    'title' in payload &&
                    'slug' in payload &&
                    'status' in payload &&
                    'content' in payload &&
                    'seo' in payload
                ) {
                    return redactPasswords(payload);
                }

                // Sanitize sensitive fields
                let data: any = redactPasswords(payload);

                // Normalize common auth payloads: { user: {..., token} } => { user, tokens }
                let meta: AnyObject | undefined;
                if (data && typeof data === 'object' && 'user' in data) {
                    const user = (data as AnyObject).user ?? {};
                    const {token, refreshToken, password, ...restUser} = user || {};

                    const tokens: AnyObject | undefined =
                        token || refreshToken
                            ? {
                                ...(token ? {accessToken: token} : {}),
                                ...(refreshToken ? {refreshToken} : {}),
                            }
                            : undefined;

                    if (tokens) {
                        meta = {
                            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
                            refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
                        };
                    }

                    data = {
                        user: redactPasswords(restUser),
                        ...(tokens ? {tokens} : {}),
                    };
                }

                const response: AnyObject = {
                    success: true,
                    message: defaultMessage(path, method, data),
                    data,
                    ...(meta ? {meta} : {}),
                    timestamp: toTimezoneIso(new Date(), TIMEZONE),
                    version: API_VERSION,
                };

                return response;
            }),
        );
    }
}
