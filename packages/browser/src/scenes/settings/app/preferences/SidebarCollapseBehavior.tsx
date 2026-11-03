import { NewCard, Select } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'
import { useLocalPreferencesStore } from '@/stores/user'

export function SidebarCollapseBehavior() {
	const sidebarConfig = useLocalPreferencesStore((store) => store.sidebar)
	const patch = useLocalPreferencesStore((store) => store.patch)

	const { t } = useTranslate()

	return (
		<NewCard.Row label={t(getKey('label'))}>
			<div>
				<Select
					value={sidebarConfig.collapsible ?? 'offcanvas'}
					onValueChange={(value) =>
						patch({
							sidebar: {
								collapsible: intoCollapse(value),
							},
						})
					}
				>
					<Select.Trigger size="sm">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{['icon', 'offcanvas'].map((option) => (
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

function intoCollapse(value: string): 'icon' | 'offcanvas' {
	if (['icon', 'offcanvas'].includes(value)) return value as 'icon' | 'offcanvas'
	return 'offcanvas'
}

const getKey = (key: string) =>
	`settingsScene.app/preferences.sections.sidebar.collapseBehavior.${key}`
