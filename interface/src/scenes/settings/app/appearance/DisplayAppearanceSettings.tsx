import { cx, Label } from '@stump/components'
import { Check } from 'lucide-react'
import React, { useState } from 'react'

// TODO: support this! lol
export default function DisplayAppearanceSettings() {
	const [isDefaultDisplay, setIsDefaultDisplay] = useState(true)

	return (
		<div>
			<Label>Display</Label>
			<div className="flex items-center gap-x-4 pt-1.5">
				<AppearanceOption
					label="Default"
					isSelected={isDefaultDisplay}
					onSelect={() => setIsDefaultDisplay(true)}
				/>
				<AppearanceOption
					label="Compact"
					isSelected={!isDefaultDisplay}
					onSelect={() => setIsDefaultDisplay(false)}
				/>
			</div>
		</div>
	)
}

type AppearanceOptionProps = {
	label: string
	isSelected: boolean
	onSelect: () => void
}
function AppearanceOption({ label, isSelected, onSelect }: AppearanceOptionProps) {
	const isDefaultDisplay = label === 'Default'

	return (
		<div className="w-1/2 text-center md:w-1/3">
			<div
				className={cx(
					'bg-background-300 hover:bg-background-300 border-edge hover:border-edge-200 relative flex h-32 w-full flex-col rounded-md border p-2 transition-all duration-200',
					isDefaultDisplay ? 'gap-y-4' : 'gap-y-2',
					{
						'border-edge-200': isSelected,
					},
				)}
				onClick={onSelect}
			>
				<div
					className={cx(
						'bg-background-400 w-full rounded-md',
						isDefaultDisplay ? 'h-1/4' : 'h-1/5',
					)}
				/>

				<div
					className={cx('bg-background-400 w-2/3 rounded-md', isDefaultDisplay ? 'h-1/4' : 'h-1/5')}
				/>

				<div
					className={cx('bg-background-400 w-5/6 rounded-md', isDefaultDisplay ? 'h-1/4' : 'h-1/5')}
				/>

				{!isDefaultDisplay && <div className="bg-background-400 h-1/5 w-full rounded-md" />}

				{isSelected && (
					<div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand">
						<Check className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			<Label>{label}</Label>
		</div>
	)
}
