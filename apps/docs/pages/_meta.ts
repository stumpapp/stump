import { Meta } from 'nextra'

export default {
	index: {
		display: 'hidden',
		title: 'Home',
		theme: {
			layout: 'raw',
			sidebar: false,
			toc: false,
		},
	},
	installation: 'Installation',
	guides: 'Guides',
	contributing: 'Contributing',
	faq: 'FAQ',
} satisfies Meta
