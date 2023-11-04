import { useStumpVersion } from '@stump/client'
import { cx, Link, TEXT_VARIANTS } from '@stump/components'
import { useMemo } from 'react'

export default function ApplicationVersion() {
	const version = useStumpVersion()

	const url = useMemo(() => {
		if (!version) return undefined

		const { rev, semver } = version
		const repoUrl = 'https://github.com/stumpapp/stump'
		if (semver && semver !== '0.0.0') {
			return `${repoUrl}/releases/tag/v${semver}`
		} else if (rev) {
			return `${repoUrl}/commit/${rev}`
		} else {
			return repoUrl
		}
	}, [version])

	return (
		<Link
			href={url}
			target="__blank"
			rel="noopener noreferrer"
			className={cx('flex items-center space-x-2 pl-2 text-xs', TEXT_VARIANTS.muted)}
			underline={false}
		>
			<span>
				v{version?.semver} - {version?.rev}
			</span>
		</Link>
	)
}
