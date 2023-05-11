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
import { ImageResizeMode, ImageResizeOptions } from '@stump/types'
import { Fragment, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from './CreateOrEditLibraryForm'

const formatOptions = [
	{ label: 'WebP', value: 'Webp' },
	{ label: 'JPEG', value: 'Jpeg' },
	{ label: 'PNG', value: 'Png' },
]
export default function ThumbnailConfigForm() {
	const form = useFormContext<Schema>()

	const resize_options = form.watch('thumbnail_config.resize_options')

	const handleSelection = (option: ImageResizeMode | 'disabled') => {
		if (option === 'disabled' || option === resize_options?.mode) {
			form.setValue('thumbnail_config.enabled', false)
			form.setValue('thumbnail_config.resize_options', undefined)
		} else {
			const newOptions = {
				mode: option,
			} as ImageResizeOptions
			form.setValue('thumbnail_config.resize_options', newOptions)
			form.setValue('thumbnail_config.enabled', true)
		}
	}

	// console.log(form.formState.errors)
	console.log(resize_options)
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
					checked={!resize_options}
					onClick={() => handleSelection('disabled')}
				/>

				<SwitchRow
					label="Explicitly Sized"
					description="A fixed height and width (in pixels)"
					checked={resize_options?.mode === 'Sized'}
					onClick={() => handleSelection('Sized')}
				>
					<fieldset
						className="flex justify-end gap-2"
						disabled={!!resize_options && resize_options.mode !== 'Sized'}
					>
						<Input
							variant="primary"
							label="Width"
							pattern="[0-9]*"
							placeholder="200"
							{...(resize_options?.mode === 'Sized'
								? form.register('thumbnail_config.resize_options.width', { valueAsNumber: true })
								: {})}
							{...(resize_options?.mode === 'Sized'
								? {
										errorMessage:
											form.formState.errors.thumbnail_config?.resize_options?.width?.message,
								  }
								: {})}
						/>
						<Input
							variant="primary"
							label="Height"
							pattern="[0-9]*"
							placeholder="350"
							{...(resize_options?.mode === 'Sized'
								? form.register('thumbnail_config.resize_options.height', { valueAsNumber: true })
								: {})}
						/>
					</fieldset>
				</SwitchRow>

				<SwitchRow
					label="Custom Scaled"
					description="A custom scale for each dimension"
					checked={resize_options?.mode === 'Scaled'}
					onClick={() => handleSelection('Scaled')}
				>
					<fieldset
						className="flex justify-end gap-2"
						disabled={!resize_options || (!!resize_options && resize_options.mode !== 'Scaled')}
					>
						<Input
							variant="primary"
							label="Width Scale"
							pattern="[0-9]*"
							placeholder="0.65"
							{...(resize_options?.mode === 'Scaled'
								? form.register('thumbnail_config.resize_options.width', { valueAsNumber: true })
								: {})}
							{...(resize_options?.mode === 'Scaled'
								? {
										errorMessage:
											form.formState.errors.thumbnail_config?.resize_options?.width?.message,
								  }
								: {})}
						/>
						<Input
							variant="primary"
							label="Height Scale"
							pattern="[0-9]*"
							placeholder="0.65"
							{...(resize_options?.mode === 'Scaled'
								? form.register('thumbnail_config.resize_options.height', { valueAsNumber: true })
								: {})}
						/>
					</fieldset>
				</SwitchRow>

				<div className="flex flex-col gap-6 py-6">
					<div className="flex flex-col gap-2">
						<Label>Image Format</Label>
						<NativeSelect
							options={formatOptions}
							disabled={!resize_options}
							{...form.register('thumbnail_config.format')}
						/>
						<Text size="xs" variant="muted">
							The format of the generated thumbnail
						</Text>
					</div>

					<Input
						variant="primary"
						label="Image Quality"
						disabled={!resize_options}
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
