import { Input, Label, RadioGroup } from '@stump/components'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'

type Props = {
	variant?: 'media' | 'series'
}

/**
 * A radio component that allows configuring the age rating filter in one of two ways:
 * 1. Any age rating (default, no filter)
 * 2. X and up (where X is a number from 0 to 18)
 */
export default function AgeRatingFilter({ variant = 'media' }: Props) {
	const form = useFormContext<{
		metadata: {
			ageRating: number | null
		}
	}>()
	const [localAgeRating, setLocalAgeRating] = useState<number | null>(8)

	const handleChange = (ageRating: number | null) => {
		form.setValue('metadata.ageRating', ageRating)
	}

	const handleSelection = (option: 'custom' | 'any-age') => {
		if (option === 'any-age') {
			handleChange(null)
		} else {
			handleChange(localAgeRating)
		}
	}

	const selection = form.watch('metadata.ageRating')
	const { onChange, ...register } = form.register('metadata.ageRating', {
		max: 18,
		min: 0,
		valueAsNumber: true,
	})

	return (
		<div>
			<Label>Age Rating</Label>
			<RadioGroup
				value={selection !== null ? 'custom' : 'any-age'}
				onValueChange={handleSelection}
				className="mt-1.5 gap-4"
			>
				<RadioGroup.CardItem
					isActive={selection === null}
					label="Any age"
					description="No age rating filter will be applied"
					value="any-age"
					innerContainerClassName="flex-col sm:items-start sm:justify-start gap-1.5"
				/>

				<RadioGroup.CardItem
					isActive={selection !== null}
					label="Aged N and up"
					description={`Only ${variant} with an age rating of N or lower will be shown, where N is the number you enter below`}
					value="custom"
					innerContainerClassName="flex-col sm:items-start sm:justify-start gap-1.5"
				>
					<fieldset className="flex items-start justify-end gap-2" disabled={selection === null}>
						<Input
							type="number"
							placeholder={localAgeRating?.toString() ?? '8'}
							{...register}
							onChange={(e) => {
								onChange(e).then(() => setLocalAgeRating(e.target.valueAsNumber))
							}}
							{...(selection !== null
								? {
										errorMessage: form.formState.errors.metadata?.ageRating?.message as string,
									}
								: {})}
						/>
					</fieldset>
				</RadioGroup.CardItem>
			</RadioGroup>
		</div>
	)
}
