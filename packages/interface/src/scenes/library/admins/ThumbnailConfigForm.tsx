import {
	cx,
	Divider,
	Heading,
	Input,
	Label,
	NativeSelect,
	RawSwitch,
	Text,
} from '@stump/components'
import { Fragment, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from './CreateOrEditLibraryForm'

type Option = 'disabled' | 'sized' | 'scaled' | 'custom-scaled'
const formatOptions = [
	{ label: 'WebP', value: 'Webp' },
	{ label: 'JPEG', value: 'Jpeg' },
	{ label: 'PNG', value: 'Png' },
]
export default function ThumbnailConfigForm() {
	const form = useFormContext<Schema>()

	const thumbnail_config = form.watch('thumbnail_config')

	// NOTE: this is so ugly... but it works for now
	const getInitialSelection = () => {
		if (!thumbnail_config || !thumbnail_config.enabled) {
			return 'disabled'
		} else if (typeof thumbnail_config.size_factor === 'number') {
			return 'scaled'
		} else {
			const [width, height] = thumbnail_config.size_factor || []
			if (width === undefined || height === undefined) {
				return 'disabled'
			}

			// if either number is a decimal, then it's a custom scale
			if (width % 1 !== 0 || height % 1 !== 0) {
				return 'custom-scaled'
			}

			return 'sized'
		}
	}

	const [selection, setSelection] = useState<Option>(getInitialSelection())

	// const handleSizeFactorChange = () => {}

	const handleSelection = (option: Option) => {
		if (selection === option) {
			setSelection('disabled')
		} else {
			setSelection(option)
		}
	}

	return (
		<div className="py-2">
			<Heading size="xs">Thumbnail Configuration</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				Control how thumbnails are generated for your library, if at all. These options include
				quality, size, and format. These settings can be changed at any time, but will not affect
				existing thumbnails.
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 py-2 dark:divide-gray-900">
				<SwitchRow
					label="Disabled"
					description="No thumbnails will be generated for this library"
					checked={selection === 'disabled'}
					onClick={() => setSelection('disabled')}
				/>

				<SwitchRow
					label="Explicitly Sized"
					description="A fixed height and width (in pixels)"
					checked={selection === 'sized'}
					onClick={() => handleSelection('sized')}
				>
					<fieldset className="flex justify-end gap-2" disabled={selection !== 'sized'}>
						<Input
							variant="primary"
							label="Width"
							pattern="[0-9]*"
							placeholder="200"
							{...(selection === 'sized'
								? form.register('thumbnail_config.size_factor.0', { valueAsNumber: true })
								: {})}
						/>
						<Input
							variant="primary"
							label="Height"
							pattern="[0-9]*"
							placeholder="350"
							{...(selection === 'sized'
								? form.register('thumbnail_config.size_factor.1', { valueAsNumber: true })
								: {})}
						/>
					</fieldset>
				</SwitchRow>

				<SwitchRow
					label="Evenly Scaled"
					description="A fixed scale that applies to each dimension"
					checked={selection === 'scaled'}
					onClick={() => handleSelection('scaled')}
				>
					<div className="flex w-full justify-end">
						<Input
							containerClassName="w-full max-w-[unset] sm:w-unset sm:max-w-sm"
							variant="primary"
							label="Scale"
							pattern="[0-9]*"
							disabled={selection !== 'scaled'}
							placeholder="0.75"
							{...(selection === 'scaled'
								? form.register('thumbnail_config.size_factor', { valueAsNumber: true })
								: {})}
						/>
					</div>
				</SwitchRow>

				<SwitchRow
					label="Custom Scaled"
					description="A custom scale for each dimension"
					checked={selection === 'custom-scaled'}
					onClick={() => handleSelection('custom-scaled')}
				>
					<fieldset className="flex justify-end gap-2" disabled={selection !== 'custom-scaled'}>
						<Input
							variant="primary"
							label="Width Scale"
							pattern="[0-9]*"
							placeholder="0.65"
							{...(selection === 'custom-scaled'
								? form.register('thumbnail_config.size_factor.0', { valueAsNumber: true })
								: {})}
						/>
						<Input
							variant="primary"
							label="Height Scale"
							pattern="[0-9]*"
							placeholder="0.65"
							{...(selection === 'custom-scaled'
								? form.register('thumbnail_config.size_factor.1', { valueAsNumber: true })
								: {})}
						/>
					</fieldset>
				</SwitchRow>

				<div className="flex flex-col gap-6 py-6">
					<div className="flex flex-col gap-2">
						<Label>Image Format</Label>
						<NativeSelect
							options={formatOptions}
							disabled={selection === 'disabled'}
							{...form.register('thumbnail_config.format')}
						/>
						<Text size="xs" variant="muted">
							The format of the generated thumbnail
						</Text>
					</div>

					<Input
						variant="primary"
						label="Image Quality"
						disabled={selection === 'disabled'}
						descriptionProps={{ className: 'text-xs' }}
						description="The quality of the generated thumbnail, between 0 and 1.0"
						errorMessage={form.formState.errors.thumbnail_config?.quality?.message}
						placeholder="0.75"
						{...form.register('thumbnail_config.quality', { valueAsNumber: true })}
					/>
				</div>
			</div>

			{/* <div className="flex max-w-2xl flex-col gap-4">
				<RadioGroup
					value={selection}
					onValueChange={(value) => setSelection(value as Option)}
					className="gap-4"
				>
					<RadioCard
						isActive={selection === 'disabled'}
						label="Disabled"
						description="No thumbnails will be generated for this library"
						value="disabled"
					/>

					<RadioCard
						isActive={selection === 'sized'}
						label="Explicitly Sized"
						description="A fixed height and width (in pixels)"
						value="sized"
					>
						<fieldset className="flex justify-end gap-2" disabled={selection !== 'sized'}>
							<Input variant="primary" label="Width" pattern="[0-9]*" placeholder="200" />
							<Input variant="primary" label="Height" pattern="[0-9]*" placeholder="350" />
						</fieldset>
					</RadioCard>

					<RadioCard
						isActive={selection === 'scaled'}
						label="Evenly Scaled"
						description="A fixed scale that applies to each dimension"
						value="scaled"
					>
						<div className="flex w-full justify-end">
							<Input
								containerClassName="w-full max-w-[unset] sm:w-unset sm:max-w-sm"
								variant="primary"
								label="Scale"
								pattern="[0-9]*"
								disabled={selection !== 'scaled'}
								placeholder="0.75"
							/>
						</div>
					</RadioCard>

					<RadioCard
						isActive={selection === 'custom-scaled'}
						label="Custom Scaled"
						description="A custom scale for each dimension"
						value="custom-scaled"
					>
						<fieldset className="flex justify-end gap-2" disabled={selection !== 'custom-scaled'}>
							<Input
								variant="primary"
								label="Width Scale"
								pattern="[0-9]*"
								placeholder="0.65"
								{...(selection === 'custom-scaled'
									? form.register('thumbnail_config.size_factor.0', { valueAsNumber: true })
									: {})}
							/>
							<Input
								variant="primary"
								label="Height Scale"
								pattern="[0-9]*"
								placeholder="0.65"
								{...(selection === 'custom-scaled'
									? form.register('thumbnail_config.size_factor.1', { valueAsNumber: true })
									: {})}
							/>
						</fieldset>
					</RadioCard>
				</RadioGroup>

				<div className="flex flex-col gap-2">
					<Label>Image Format</Label>
					<NativeSelect
						options={formatOptions}
						disabled={selection === 'disabled'}
						{...form.register('thumbnail_config.format')}
					/>
					<Text size="xs" variant="muted">
						The format of the generated thumbnail
					</Text>
				</div>

				<Input
					variant="primary"
					label="Image Quality"
					disabled={selection === 'disabled'}
					descriptionProps={{ className: 'text-xs' }}
					description="The quality of the generated thumbnail, between 0 and 1.0"
					errorMessage={form.formState.errors.thumbnail_config?.quality?.message}
					placeholder="0.75"
					{...form.register('thumbnail_config.quality', { valueAsNumber: true })}
				/>
			</div> */}
		</div>
	)
}

type SwitchRowProps = {
	label: string
	description: string
	checked: boolean
	onClick: () => void
	children?: React.ReactNode
}

const SwitchRow = ({ label, description, checked, onClick, children }: SwitchRowProps) => {
	const Container = children ? 'div' : Fragment
	const containerProps = children ? { className: 'py-6' } : {}
	return (
		<Container {...containerProps}>
			<div
				className={cx('flex items-center justify-between md:items-start', {
					'pb-4': !!children,
					'py-6': !children,
				})}
			>
				<RawSwitch className="text-gray-900" checked={checked} onClick={onClick} primaryRing />

				<div className="flex flex-grow flex-col gap-2 text-right">
					<Label>{label}</Label>
					<Text size="xs" variant="muted">
						{description}
					</Text>
				</div>
			</div>

			{children}
		</Container>
	)
}
