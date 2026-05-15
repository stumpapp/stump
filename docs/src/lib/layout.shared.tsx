import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { appName, gitConfig } from './shared'

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<div className="gap-2 flex items-center">
					<img src="/favicon.png" alt="Stump logo" className="size-6" />
					<span>{appName}</span>
				</div>
			),
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
		links: [
			{
				text: 'Docs',
				url: '/docs',
				on: 'nav',
			},
		],
	}
}
