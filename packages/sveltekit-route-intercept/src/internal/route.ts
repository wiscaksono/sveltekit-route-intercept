import type { RouteParams } from '../types';

const CATCH_ALL = /^\.\.\.(.+)$/;
const OPTIONAL_CATCH_ALL = /^\[\.\.\.(.+)\]$/;
const OMIT_SEGMENT = Symbol('omit-segment');

export function interpolateRoutePath(route: string, params: RouteParams): string {
	const segments = route.split('/').filter(Boolean);
	const resolved = segments
		.map((segment) => {
			if (!segment.startsWith('[') || !segment.endsWith(']')) {
				return segment;
			}

			const key = segment.slice(1, -1);
			const optionalMatch = key.match(OPTIONAL_CATCH_ALL);
			if (optionalMatch) {
				const paramKey = optionalMatch[1];
				if (!paramKey) return OMIT_SEGMENT;

				const value = params[paramKey];
				if (value === undefined) {
					return OMIT_SEGMENT;
				}

				if (Array.isArray(value) && value.length === 0) {
					return OMIT_SEGMENT;
				}

				return normalizeValue(value, paramKey);
			}

			const catchAllMatch = key.match(CATCH_ALL);
			if (catchAllMatch) {
				const paramKey = catchAllMatch[1];
				if (!paramKey) return OMIT_SEGMENT;
				return normalizeValue(params[paramKey], paramKey);
			}

			return normalizeValue(params[key], key);
		})
		.filter((segment): segment is string => segment !== OMIT_SEGMENT)
		.join('/');

	return `/${resolved}`;
}

function normalizeValue(value: string | number | string[] | undefined, key: string): string {
	if (value === undefined) {
		throw new Error(`Missing route param: ${key}`);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			throw new Error(`Route param array must not be empty: ${key}`);
		}

		return value
			.map((part) => {
				if (part.length === 0) {
					throw new Error(`Route param array segment must not be empty: ${key}`);
				}

				return encodeURIComponent(part);
			})
			.join('/');
	}

	if (String(value).length === 0) {
		throw new Error(`Route param must not be empty: ${key}`);
	}

	return encodeURIComponent(String(value));
}
