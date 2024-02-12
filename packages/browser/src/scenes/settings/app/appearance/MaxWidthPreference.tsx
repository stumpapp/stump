import { usePreferences } from '@stump/client'
import { cx, Label, NativeSelect, Text } from '@stump/components'
import React from 'react'

const OPTIONS = [
	{ label: 'No limit', value: 0 },
	{
		label: '1152px',
		value: 1152,
	},
	{
		label: '1280px',
		value: 1280,
	},
	{
		label: '1440px',
		value: 1440,
	},
	{
		label: '1600px',
		value: 1600,
	},
	{
		label: '1920px',
		value: 1920,
	},
]

export default function MaxWidthPreference() {
	const {
		preferences: { layout_max_width_px, primary_navigation_mode },
		update,
	} = usePreferences()

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value

		if (!value) {
			return update({ layout_max_width_px: null })
		}

		// TODO: support custom
		const parsed = parseInt(value)
		if (!isNaN(parsed) && OPTIONS.some((opt) => opt.value === parsed)) {
			return update({ layout_max_width_px: parsed })
		}

		return null
	}

	return (
		<div
			className="flex flex-col gap-y-1.5 md:max-w-md"
			title={
				primary_navigation_mode === 'SIDEBAR'
					? // TODO: support it
						'This setting is not currently supported when the primary navigation is set to sidebar'
					: undefined
			}
		>
			<Label className={cx({ 'text-opacity-50': primary_navigation_mode === 'SIDEBAR' })}>
				Adjusted width
			</Label>
			<NativeSelect
				value={layout_max_width_px || undefined}
				options={OPTIONS}
				onChange={handleChange}
				disabled={primary_navigation_mode === 'SIDEBAR'}
			/>
			<Text
				size="xs"
				variant="muted"
				className={cx({ 'text-opacity-50': primary_navigation_mode === 'SIDEBAR' })}
			>
				Stump applies a max-width to the viewport. This setting allows you to adjust or remove this
				limit
			</Text>
		</div>
	)
}
