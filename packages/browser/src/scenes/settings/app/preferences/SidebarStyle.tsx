import { NewCard, Select } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'
import { useLocalPreferencesStore } from '@/stores/user'

export function SidebarStyle() {
	const sidebarConfig = useLocalPreferencesStore((store) => store.sidebar)
	const patch = useLocalPreferencesStore((store) => store.patch)

	const { t } = useTranslate()

	return (
		<NewCard.Row label={t(getKey('label'))}>
			<div>
				<Select
					value={sidebarConfig.variant ?? 'sidebar'}
					onValueChange={(style) =>
						patch({
							sidebar: {
								variant: intoStyle(style),
							},
						})
					}
				>
					<Select.Trigger size="sm">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{['inset', 'sidebar', 'floating'].map((option) => (
							<Select.Item key={option} value={option}>
								{t(getKey(`options.${option}`))}
							</Select.Item>
						))}
					</Select.Content>
				</Select>
			</div>
		</NewCard.Row>
	)
}

function intoStyle(value: string): 'sidebar' | 'floating' | 'inset' {
	if (['sidebar', 'floating', 'inset'].includes(value))
		return value as 'sidebar' | 'floating' | 'inset'
	return 'sidebar'
}

const getKey = (key: string) => `settingsScene.app/preferences.sections.sidebar.sidebarStyle.${key}`
