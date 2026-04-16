export type Photo = {
	id: string;
	title: string;
	description: string;
	location: string;
	color: string;
};

export const photos: Photo[] = [
	{
		id: 'aurora-lake',
		title: 'Aurora Lake',
		description: 'Cold light spilling over a still lake at midnight.',
		location: 'Northland, Finland',
		color: '#14b8a6'
	},
	{
		id: 'red-desert',
		title: 'Red Desert',
		description: 'Wind-carved dunes under a pale afternoon sky.',
		location: 'Erg Chebbi, Morocco',
		color: '#ea580c'
	},
	{
		id: 'coast-mist',
		title: 'Coast Mist',
		description: 'First light hitting the cliffs before the fog lifts.',
		location: 'Big Sur, California',
		color: '#0f766e'
	},
	{
		id: 'city-noir',
		title: 'City Noir',
		description: 'Rain, reflections, and neon on a midnight avenue.',
		location: 'Shinjuku, Tokyo',
		color: '#6d28d9'
	},
	{
		id: 'pine-trail',
		title: 'Pine Trail',
		description: 'A narrow path cutting through high mountain pines.',
		location: 'Banff, Canada',
		color: '#166534'
	},
	{
		id: 'salt-flats',
		title: 'Salt Flats',
		description: 'A mirror horizon after short summer rain.',
		location: 'Uyuni, Bolivia',
		color: '#0369a1'
	}
];

export function getPhoto(id: string): Photo | undefined {
	return photos.find((photo) => photo.id === id);
}
