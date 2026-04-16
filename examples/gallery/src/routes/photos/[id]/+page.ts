import { error } from '@sveltejs/kit';
import { getPhoto } from '$lib/photos';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const photo = getPhoto(params.id);

	if (!photo) {
		error(404, 'Photo not found');
	}

	return { photo };
};
