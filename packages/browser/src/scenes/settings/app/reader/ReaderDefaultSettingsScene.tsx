import { Button, NewCard, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'
import { useShallow } from 'zustand/react/shallow'

import { Container, ContentContainer } from '@/components/container'
import ReaderSettings from '@/components/readers/imageBased/container/ReaderSettings'
import { useReaderStore } from '@/stores'

import DayResetHourOffsetPreference from '../preferences/DayResetHourOffsetPreference'
import ReadingSessionGracePeriodPreference from '../preferences/ReadingSessionGracePeriodPreference'
import DefaultFontFamily from './DefaultFontFamily'
import DefaultFontSize from './DefaultFontSize'
import DefaultLineHeight from './DefaultLineHeight'
import DefaultReadingDirection from './DefaultReadingDirection'
import PreloadPagesSection from './PreloadPagesSection'

// TODO: this page is a big ol' wip for now, and so didn't bother adding localization changes
// yet to avoid issues down the road and/or wasting people's time translating.
// the sheets for format-specific settings needs lots of work, in part that they are
// not very filled-out yet (esp ebook). my current plan is to just port how
// expo does it, and ideally while i am at it try to improve the awkward cascading
// dance of global vs book-level vs format-level vs library-level settings :)
// TODO(i8n): keys/values
export default function ReaderDefaultSettingsScene() {
	const { t } = useLocaleContext()

	const { bookPreferences, clearStore } = useReaderStore(
		useShallow((state) => ({
			bookPreferences: state.bookPreferences,
			clearStore: state.clearStore,
		})),
	)

	const canClearStore = Object.keys(bookPreferences).length > 0

	return (
		<Container>
			<Helmet>
				<title>Stump | {t('settingsScene.app/reader.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<NewCard label="Universal" description="Settings which apply to all types of books">
					<DefaultReadingDirection />

					{/* TODO: not sure these belong here? idk they are reading preferences. 
						im being a bit pedantic but this should be renamed `reading` preferences and 
						not specifically reader, geared towards readers and not generally reading experience
					*/}
					<DayResetHourOffsetPreference />
					<ReadingSessionGracePeriodPreference />
				</NewCard>

				<NewCard label="Formats" description="Configure reader default settings independently">
					<NewCard.Row
						label={t(getSectionKey('imageBasedBooks.label'))}
						description={t(getSectionKey('imageBasedBooks.description'))}
					>
						<Sheet
							title={t(getSectionKey('imageBasedBooks.label'))}
							description={t(getSectionKey('imageBasedBooks.description'))}
							trigger={
								<Button size="sm" variant="outline">
									{t('common.edit')}
								</Button>
							}
							size="lg"
							contentClassName="overflow-y-scroll"
						>
							<div className="gap-4 px-4 pb-4 flex flex-col">
								<ReaderSettings />
								<PreloadPagesSection />
							</div>
						</Sheet>
					</NewCard.Row>

					<NewCard.Row
						label={t(getSectionKey('textBasedBooks.label'))}
						description={t(getSectionKey('textBasedBooks.description'))}
					>
						<Sheet
							title={t(getSectionKey('textBasedBooks.label'))}
							description={t(getSectionKey('textBasedBooks.description'))}
							trigger={
								<Button size="sm" variant="outline">
									{t('common.edit')}
								</Button>
							}
							size="default"
						>
							<div className="gap-y-1.5 md:max-w-md px-4 pb-4 flex flex-col">
								<DefaultFontFamily />
								<DefaultFontSize />
								<DefaultLineHeight />
							</div>
						</Sheet>
					</NewCard.Row>
				</NewCard>

				<div className="gap-y-3 flex flex-col">
					<div>
						<h3 className="text-base font-medium text-foreground">
							{t(getSectionKey('data.sections.clearStore.label'))}
						</h3>
						<Text variant="muted" size="sm">
							{t(getSectionKey('data.sections.clearStore.description'))}
						</Text>
					</div>

					<div>
						<Button variant="destructive" size="sm" onClick={clearStore} disabled={!canClearStore}>
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
