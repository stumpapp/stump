import { Heading, Link, Text } from '@stump/components'

import { useLocaleContext } from '../../../i18n/context'

export default function EditLibraryScene() {
	const { t } = useLocaleContext()
	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-2">
				<Heading size="lg">{t('editLibraryScene.heading')}</Heading>
				<Text size="sm" variant="muted">
					{t('editLibraryScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/libraries">
						{t('editLibraryScene.subtitleLink')}.
					</Link>
				</Text>
			</header>
		</div>
	)
}
