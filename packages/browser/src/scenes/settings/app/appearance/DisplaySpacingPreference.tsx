import { cn, cx, Label, Text } from '@stump/components'
import { Check } from 'lucide-react'

import { usePreferences, useTheme } from '@/hooks'

export default function DisplaySpacingPreference() {
	const {
		preferences: { enable_compact_display },
		update,
	} = usePreferences()

	const handleChange = async (enable_compact: boolean) => {
		if (enable_compact === enable_compact_display) return

		try {
			await update({ enable_compact_display: enable_compact })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<div className="flex flex-col gap-y-1.5">
			<Label>Display spacing</Label>
			<Text size="sm" variant="muted">
				Adjusts the overall spacing between elements throughout the app
			</Text>
			<div className="flex items-center gap-x-4">
				<AppearanceOption
					label="Default"
					isSelected={!enable_compact_display}
					onSelect={() => handleChange(false)}
				/>
				<AppearanceOption
					label="Compact"
					isSelected={!!enable_compact_display}
					onSelect={() => handleChange(true)}
					isDisabled
				/>
			</div>
			<Text size="xs" variant="muted" className="italic">
				* Compact display mode is not implemented yet
			</Text>
		</div>
	)
}

type AppearanceOptionProps = {
	label: string
	isSelected: boolean
	isDisabled?: boolean
	onSelect: () => void
}
function AppearanceOption({ label, isSelected, isDisabled, onSelect }: AppearanceOptionProps) {
	const { isDarkVariant } = useTheme()

	const isDefaultDisplay = label === 'Default'
	const isLightVariant = !isDarkVariant

	return (
		<div className="w-1/2 text-center md:w-1/3 lg:w-1/4">
			<div
				className={cn(
					'relative flex h-32 w-full flex-col rounded-md border border-edge bg-background-surface p-2 opacity-80 transition-all duration-200',
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
						'w-full rounded-md bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				<div
					className={cx(
						'w-2/3 rounded-md bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				<div
					className={cx(
						'w-5/6 rounded-md bg-background-surface-secondary',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				{!isDefaultDisplay && (
					<div className="h-1/5 w-full rounded-md bg-background-surface-secondary" />
				)}

				{isSelected && (
					<div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand">
						<Check className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<Label className={cn({ 'opacity-50': isDisabled })}>{label}</Label>
		</div>
	)
}
