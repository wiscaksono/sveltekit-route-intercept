import type { InterceptPageState, JsonValue } from './types';

/**
 * Returns a new page state object with an interceptor payload stored at `key`.
 *
 * @typeParam TPageState - Existing page state shape.
 * @typeParam TKey - Interceptor key used inside `__routeIntercept`.
 * @typeParam TPayload - JSON-safe payload type to store.
 * @param state - Current page state object.
 * @param key - Interceptor key under `__routeIntercept`.
 * @param payload - Payload to persist.
 * @returns A shallow-cloned page state with updated interceptor payloads.
 */
export function withInterceptPayload<
	TPageState extends Record<string, unknown>,
	TKey extends string,
	TPayload extends JsonValue
>(state: TPageState, key: TKey, payload: TPayload): TPageState {
	const current = state as InterceptPageState<Record<TKey, TPayload>>;

	return {
		...state,
		__routeIntercept: {
			...current.__routeIntercept,
			[key]: payload
		}
	};
}

/**
 * Reads an interceptor payload from page state by key.
 *
 * @typeParam TKey - Interceptor key to read.
 * @typeParam TPayload - Expected payload type for the key.
 * @param state - Page state object that may contain `__routeIntercept`.
 * @param key - Interceptor key under `__routeIntercept`.
 * @returns The payload for `key`, or `undefined` when absent.
 */
export function getInterceptPayload<TKey extends string, TPayload extends JsonValue>(
	state: Record<string, unknown>,
	key: TKey
): TPayload | undefined {
	const payloadMap = (state as InterceptPageState<Record<TKey, TPayload>>).__routeIntercept;
	return payloadMap?.[key];
}
