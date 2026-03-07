import { cn, cx, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Check } from 'lucide-react'

import { usePreferences, useTheme } from '@/hooks'

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

	return (
		<div className="flex flex-col gap-y-1.5">
			<Label>{t(getKey('label'))}</Label>
			<Text size="sm" variant="muted">
				{t(getKey('description'))}
			</Text>
			<div className="flex items-center gap-x-4">
				<AppearanceOption
					label={t(getKey('options.sidebar'))}
					isSelected={primaryNavigationMode === 'SIDEBAR'}
					onSelect={() => handleChange('SIDEBAR')}
					isSidebar
				/>
				<AppearanceOption
					label={t(getKey('options.topbar'))}
					isSelected={primaryNavigationMode === 'TOPBAR'}
					onSelect={() => handleChange('TOPBAR')}
				/>
			</div>
			<Text size="xs" variant="muted" className="italic">
				{t(getKey('disclaimer'))}
			</Text>
		</div>
	)
}

type AppearanceOptionProps = {
	label: string
	isSelected: boolean
	onSelect: () => void
	isSidebar?: boolean
}
function AppearanceOption({ label, isSelected, onSelect, isSidebar }: AppearanceOptionProps) {
	const { isDarkVariant } = useTheme()

	const isLightVariant = !isDarkVariant

	return (
		<div className="w-1/2 text-center md:w-1/3 lg:w-1/4">
			<div
				className={cx(
					'relative flex h-32 w-full overflow-hidden rounded-md border border-edge bg-background-surface opacity-80 transition-all duration-200 hover:border-edge-subtle hover:opacity-100',
					isSidebar ? 'flex-row' : 'flex-col gap-y-2',
					{
						'border-edge-subtle': isSelected,
					},
				)}
				onClick={onSelect}
			>
				<div className={cx('bg-sidebar', isSidebar ? 'h-full w-1/4' : 'h-1/5 w-full')} />

				<div
					className={cn('flex h-full w-full flex-col gap-y-4 p-2', {
						'bg-background/80': isLightVariant,
					})}
				>
					<div className="h-1/5 w-2/3 shrink-0 rounded-md bg-background-surface-secondary" />
					<div className="h-1/5 w-full shrink-0 rounded-md bg-background-surface-secondary" />
					<div className="h-1/5 w-full shrink-0 rounded-md bg-background-surface-secondary" />
				</div>

				{isSelected && (
					<div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-fill-brand">
						<Check className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<Label>{label}</Label>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.primaryNavigation'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
