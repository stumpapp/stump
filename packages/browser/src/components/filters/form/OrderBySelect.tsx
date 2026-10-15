import { Label, Select } from '@stump/components'
import {
	LibraryModelOrdering,
	MediaMetadataModelOrdering,
	MediaModelOrdering,
	SeriesModelOrdering,
} from '@stump/graphql'
import { Fragment } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { OrderingField } from '../context'
import { FilterableEntity } from '.'

type OptionGroup = {
	/** is a key under `shared.sorting.fieldGroups` */
	label?: string
	fields: OrderingField[]
}

const options: Record<FilterableEntity, OptionGroup[]> = {
	library: [
		{
			fields: [
				LibraryModelOrdering.Name,
				LibraryModelOrdering.Status,
				LibraryModelOrdering.CreatedAt,
			],
		},
	],
	media: [
		{
			label: 'book',
			fields: [
				MediaModelOrdering.Name,
				MediaModelOrdering.CreatedAt,
				MediaModelOrdering.ModifiedAt,
				MediaModelOrdering.Size,
				MediaModelOrdering.Pages,
				MediaModelOrdering.Extension,
				MediaModelOrdering.Path,
				MediaModelOrdering.Status,
				MediaModelOrdering.SeriesId,
			],
		},
		{
			label: 'metadata',
			fields: [
				MediaMetadataModelOrdering.Number,
				MediaMetadataModelOrdering.Volume,
				MediaMetadataModelOrdering.Year,
			],
		},
	],
	series: [
		{
			fields: [
				SeriesModelOrdering.Name,
				SeriesModelOrdering.Status,
				SeriesModelOrdering.CreatedAt,
				SeriesModelOrdering.Description,
				SeriesModelOrdering.LibraryId,
			],
		},
	],
}

type Props = {
	entity: FilterableEntity
	value?: string
	onChange?: (value: OrderingField) => void
}

export default function OrderBySelect({ entity, value, onChange }: Props) {
	const { translate } = useTranslate()

	const groups = options[entity]
	const isKnownValue = groups.some((group) => group.fields.some((field) => field === value))

	return (
		<div>
			<Label className="mb-1.5">{translate('shared.sorting.label')}</Label>
			<Select
				value={isKnownValue ? value : ''}
				onValueChange={(newValue) => onChange?.(newValue as OrderingField)}
			>
				<Select.Trigger size="sm">
					<Select.Value placeholder={translate('shared.sorting.placeholder')} />
				</Select.Trigger>
				<Select.Content>
					{groups.map((group, index) => (
						<Fragment key={group.label ?? index}>
							{index > 0 && <Select.Separator />}
							<Select.Group>
								{group.label && (
									<Select.Label>
										{translate(`shared.sorting.fieldGroups.${group.label}`)}
									</Select.Label>
								)}
								{group.fields.map((field) => (
									<Select.Item key={field} value={field}>
										{translate(`shared.sorting.sortField.${field}`)}
									</Select.Item>
								))}
							</Select.Group>
						</Fragment>
					))}
				</Select.Content>
			</Select>
		</div>
	)
}
