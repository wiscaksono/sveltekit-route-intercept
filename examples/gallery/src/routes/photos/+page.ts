import { photos } from '$lib/photos';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		thumbnails: photos.map((photo) => ({
			id: photo.id,
			title: photo.title,
			location: photo.location,
			color: photo.color
		}))
	};
};
