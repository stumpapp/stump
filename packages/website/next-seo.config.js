// TODO: more config -> https://github.com/garmeeh/next-seo#add-seo-to-page

export default {
	title: undefined,
	titleTemplate: 'Stump | %s',
	defaultTitle: 'Stump',
	description:
		'Free, open source, self-hosting for all your comic books, manga and digital book collections.',
	canonical: 'https://stumpapp.dev',
	openGraph: {
		type: 'website',
		locale: 'en_US',
		url: 'https://stumpapp.dev',
		images: [
			{
				url: 'https://stumpapp.dev/og.png',
				width: 1332,
				height: 699,
				alt: 'Stump OG Image',
				type: 'image/png',
			},
		],
		site_name: 'Stump',
	},
	twitter: {
		handle: '@stumpapp',
		cardType: 'summary_large_image',
	},
};
