import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'
import { useReaderStore } from '@/stores'

import DefaultFontFamily from './DefaultFontFamily'
import DefaultFontSize from './DefaultFontSize'
import DefaultReadingDirection from './DefaultReadingDirection'
import PreloadPagesSection from './PreloadPagesSection'

export default function ReaderDefaultSettingsScene() {
	const { t } = useLocaleContext()

	const { bookPreferences, clearStore } = useReaderStore((state) => ({
		bookPreferences: state.bookPreferences,
		clearStore: state.clearStore,
	}))

	const canClearStore = Object.keys(bookPreferences).length > 0

	return (
		<Container>
			<Helmet>
				<title>Stump | {t('settingsScene.app/reader.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-y-1.5 md:max-w-md">
					<DefaultReadingDirection />
				</div>

				<div className="flex flex-col gap-y-8">
					<div>
						<Heading size="sm">{t(getSectionKey('imageBasedBooks.label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getSectionKey('imageBasedBooks.description'))}
						</Text>
					</div>

					<PreloadPagesSection />
				</div>

				<div className="flex flex-col gap-y-8">
					<div>
						<Heading size="sm">{t(getSectionKey('textBasedBooks.label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getSectionKey('textBasedBooks.description'))}
						</Text>
					</div>

					<div className="flex flex-col gap-y-1.5 md:max-w-md">
						<DefaultFontFamily />
						<DefaultFontSize />
					</div>
				</div>

				<div className="flex flex-col gap-y-8">
					<div>
						<Heading size="sm">{t(getSectionKey('data.sections.clearStore.label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getSectionKey('data.sections.clearStore.description'))}
						</Text>
					</div>

					<div>
						<Button variant="danger" size="sm" onClick={clearStore} disabled={!canClearStore}>
							{t(getSectionKey('data.sections.clearStore.button'))}
						</Button>
					</div>
				</div>
			</ContentContainer>
		</Container>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
const getSectionKey = (key: string) => getKey(`sections.${key}`)
