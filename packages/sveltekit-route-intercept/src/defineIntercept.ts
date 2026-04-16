import { interpolateRoutePath } from './internal/route';
import { isJsonValue } from './types';
import type { InterceptDefinition, JsonValue, RouteParamsFromPath } from './types';

type DefineInterceptBaseConfig<
	TKey extends string,
	TRoute extends string
> = {
	key: TKey;
	route: TRoute;
	href?: (params: RouteParamsFromPath<TRoute>) => string;
};

/**
 * Configuration for strict interception with a required payload type guard.
 */
export type DefineInterceptConfig<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
> = DefineInterceptBaseConfig<TKey, TRoute> & {
	parsePayload: (value: unknown) => value is TPayload;
};

/**
 * Configuration for JSON-safe interception where payload validation uses `isJsonValue`.
 */
export type DefineInterceptJsonConfig<TKey extends string, TRoute extends string> =
	DefineInterceptBaseConfig<TKey, TRoute> & {
		parsePayload?: undefined;
	};

/**
 * Creates an interceptor definition using default JSON payload validation.
 *
 * @remarks
 * Use this overload when route data is already JSON-safe and you do not need
 * a custom type guard.
 *
 * @typeParam TKey - Stable state key used for this interceptor.
 * @typeParam TRoute - Route template like `/photos/[id]`.
 * @param config - Interceptor key, route, and optional custom href builder.
 * @returns A typed interceptor definition ready for `createInterceptor`.
 */
export function defineIntercept<TKey extends string, TRoute extends string>(
	config: DefineInterceptJsonConfig<TKey, TRoute>
): InterceptDefinition<TKey, TRoute, RouteParamsFromPath<TRoute>, JsonValue>;

/**
 * Creates an interceptor definition with strict payload typing.
 *
 * @remarks
 * This overload requires `parsePayload` so intercepted payloads are narrowed
 * to `TPayload` only when the guard succeeds.
 *
 * @typeParam TKey - Stable state key used for this interceptor.
 * @typeParam TRoute - Route template like `/photos/[id]`.
 * @typeParam TPayload - Payload type accepted by `parsePayload`.
 * @param config - Interceptor key, route, optional href builder, and type guard.
 * @returns A typed interceptor definition ready for `createInterceptor`.
 *
 * @example
 * ```ts
 * const photo = defineIntercept({
 * 	key: 'photo',
 * 	route: '/photos/[id]',
 * 	parsePayload: (value): value is { photo: { id: string } } => {
 * 		return typeof value === 'object' && value !== null && 'photo' in value;
 * 	}
 * });
 * ```
 */
export function defineIntercept<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
>(
	config: DefineInterceptConfig<TKey, TRoute, TPayload>
): InterceptDefinition<TKey, TRoute, RouteParamsFromPath<TRoute>, TPayload>;

export function defineIntercept<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
>(
	config: DefineInterceptJsonConfig<TKey, TRoute> | DefineInterceptConfig<TKey, TRoute, TPayload>
): InterceptDefinition<TKey, TRoute, RouteParamsFromPath<TRoute>, JsonValue | TPayload> {
	if ('parsePayload' in config && config.parsePayload) {
		return {
			key: config.key,
			route: config.route,
			parsePayload: config.parsePayload,
			href: config.href ?? ((params) => interpolateRoutePath(config.route, params))
		};
	}

	return {
		key: config.key,
		route: config.route,
		parsePayload: isJsonValue,
		href: config.href ?? ((params) => interpolateRoutePath(config.route, params))
	};
}
