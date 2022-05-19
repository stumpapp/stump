export interface SidebarLink {
	href: string;
	description: string;
}

export interface SidebarItem {
	title: string;
	links: SidebarLink[];
}

export const sidebarItems: SidebarItem[] = [
	{
		title: 'FAQ',
		links: [{ href: '/faq', description: 'FAQ' }],
	},
	{
		title: 'Installation',
		links: [
			{ href: '/installation', description: 'Getting Started' },
			{ href: '/installation/docker', description: 'Docker' },
			{ href: '/installation/executable', description: 'Executable' },
		],
	},
	{
		title: 'Guides',
		links: [
			{ href: '/guides', description: 'What is Stump?' },
			{ href: '/guides/libraries', description: 'Libraries' },
			{ href: '/guides/series', description: 'Series' },
			{ href: '/guides/fs-scanning', description: 'File Scanning' },
			{ href: '/guides/user-accounts', description: 'User Accounts' },
			{ href: '/guides/read-progress', description: 'Read Progress' },
			{ href: '/guides/full-text-search', description: 'Full Text Search' },
			{ href: '/guides/web-ui', description: "Stump's Readers" },
		],
	},
	{
		title: 'Contributing',
		links: [{ href: '/contributing', description: 'Contributing' }],
	},
];
