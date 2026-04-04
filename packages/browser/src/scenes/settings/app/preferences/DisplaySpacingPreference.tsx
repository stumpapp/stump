import { cn, cx, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Check } from 'lucide-react'

import { usePreferences, useTheme } from '@/hooks'

export default function DisplaySpacingPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableCompactDisplay },
		update,
	} = usePreferences()

	const handleChange = async (enable_compact: boolean) => {
		if (enable_compact === enableCompactDisplay) return

		try {
			await update({ enableCompactDisplay: enable_compact })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<div className="gap-y-1.5 flex flex-col">
			<Label>{t(getKey('label'))}</Label>
			<Text size="sm" variant="muted">
				{t(getKey('description'))}
			</Text>
			<div className="gap-x-4 flex items-center">
				<AppearanceOption
					label={t(getKey('options.default'))}
					isSelected={!enableCompactDisplay}
					onSelect={() => handleChange(false)}
					isDefaultDisplay
				/>
				<AppearanceOption
					label={t(getKey('options.compact'))}
					isSelected={!!enableCompactDisplay}
					onSelect={() => handleChange(true)}
					isDisabled
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
	isDisabled?: boolean
	onSelect: () => void
	isDefaultDisplay?: boolean
}
function AppearanceOption({
	label,
	isSelected,
	isDisabled,
	onSelect,
	isDefaultDisplay,
}: AppearanceOptionProps) {
	const { isDarkVariant } = useTheme()

	const isLightVariant = !isDarkVariant

	return (
		<div className="md:w-1/3 lg:w-1/4 w-1/2 text-center">
			<div
				className={cn(
					'h-32 rounded-md p-2 relative flex w-full flex-col border border-edge bg-background-surface opacity-80 transition-all duration-200',
					isDefaultDisplay ? 'gap-y-4' : 'gap-y-2',
					{
						'border-edge-subtle': isSelected,
					},
					{
						'cursor-not-allowed opacity-50': isDisabled,
					},
					{
						'hover:border-edge-subtle hover:opacity-100': !isDisabled,
					},
					{
						'bg-background/80': isLightVariant,
					},
				)}
				onClick={isDisabled ? undefined : onSelect}
			>
				<div
					className={cx(
						'rounded-md w-full bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				<div
					className={cx(
						'rounded-md w-2/3 bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				<div
					className={cx(
						'rounded-md w-5/6 bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				{!isDefaultDisplay && (
					<div className="rounded-md h-1/5 w-full bg-background-surface-secondary" />
				)}

				{isSelected && (
					<div className="bottom-2 right-2 h-6 w-6 absolute flex items-center justify-center rounded-full bg-fill-brand">
						<Check className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<Label className={cn({ 'opacity-50': isDisabled })}>{label}</Label>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.displaySpacing'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
