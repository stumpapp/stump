import { NewCard, Tabs } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { PanelLeft, PanelTop } from 'lucide-react'

import { usePreferences } from '@/hooks'

export default function PrimaryNavigationPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { primaryNavigationMode },
		update,
	} = usePreferences()

	const handleChange = async (mode: 'SIDEBAR' | 'TOPBAR') => {
		try {
			await update({ primaryNavigationMode: mode })
		} catch (error) {
			console.error(error)
		}
	}

	const selectedOption = primaryNavigationMode === 'SIDEBAR' ? 'sidebar' : 'topbar'

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<Tabs
				value={selectedOption}
				onValueChange={(value) => handleChange(value === 'sidebar' ? 'SIDEBAR' : 'TOPBAR')}
				variant="primary"
				activeOnHover
			>
				<Tabs.List className="sm:w-fit w-full">
					<Tabs.Trigger value="sidebar">
						<div className="gap-2 flex items-center">
							<PanelLeft className="size-4" />
							<span className="font-medium text-xs">{t(getKey('options.sidebar'))}</span>
						</div>
					</Tabs.Trigger>
					<Tabs.Trigger value="topbar">
						<div className="gap-2 flex items-center">
							<PanelTop className="size-4" />
							<span className="font-medium text-xs">{t(getKey('options.topbar'))}</span>
						</div>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.primaryNavigation'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
