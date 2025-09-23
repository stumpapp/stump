import { MediaMetadataModelOrdering, MediaModelOrdering, MediaOrderBy } from '@stump/graphql'
import { useCallback } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterSheet } from '~/components/filter'
import { Heading, icons, Label, RadioGroup, RadioGroupItem, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useBookFilterStore } from '~/stores/filters'

// TODO: Support tiered ordering, e.g.: primary sort of metadata.title, secondary fallback of media.name

export default function Sort() {
	const insets = useSafeAreaInsets()

	const { sort, setSort } = useBookFilterStore((state) => ({
		sort: state.sort,
		setSort: state.setSort,
	}))

	const { field, direction } = match(sort)
		.with({ media: P.not(P.nullish) }, ({ media: { field, direction } }) => ({
			field,
			direction,
		}))
		.with({ metadata: P.not(P.nullish) }, ({ metadata: { field, direction } }) => ({
			field,
			direction,
		}))
		.otherwise(() => ({ field: 'NAME', direction: 'ASC' }))

	const handleSortDirectionChanged = useCallback(
		(dir: string) => {
			if (dir !== 'ASC' && dir !== 'DESC') return
			const config = match(sort)
				.with(
					{ media: P.not(P.nullish) },
					({ media: { field } }) =>
						({
							media: { field, direction: dir },
						}) as MediaOrderBy,
				)
				.with(
					{ metadata: P.not(P.nullish) },
					({ metadata: { field } }) =>
						({
							metadata: { field, direction: dir },
						}) as MediaOrderBy,
				)
				.otherwise(() => sort)
			setSort(config)
		},
		[sort, setSort],
	)

	const handleSortFieldChanged = useCallback(
		(field: string, isMetadata: boolean) => {
			const config = isMetadata
				? ({
						metadata: { field: field as MediaMetadataModelOrdering, direction },
					} as MediaOrderBy)
				: ({
						media: { field: field as MediaModelOrdering, direction },
					} as MediaOrderBy)
			setSort(config)
		},
		[setSort, direction],
	)

	return (
		<FilterSheet label="Sort" icon={icons.ArrowDownUp} isActive>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Sort</Heading>
					<Text className="text-foreground-muted">Change the order of displayed books</Text>
				</View>

				<View className="gap-3">
					<Label className="font-medium leading-6 text-foreground-muted">Direction</Label>

					<RadioGroup
						value={direction}
						onValueChange={handleSortDirectionChanged}
						className="squircle gap-0 rounded-lg border border-edge bg-background-surface"
					>
						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="ASC" id="ascending" />
							<Label htmlFor="ascending">Ascending</Label>
						</View>
						<Divider />
						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="DESC" id="descending" />
							<Label htmlFor="descending">Descending</Label>
						</View>
					</RadioGroup>
				</View>

				<View className="gap-3">
					<Label className="font-medium leading-6 text-foreground-muted">Book Field</Label>

					<RadioGroup
						value={field}
						onValueChange={(value) => handleSortFieldChanged(value, false)}
						className="squircle gap-0 rounded-lg border border-edge bg-background-surface"
					>
						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="NAME" id="name" />
							<Label htmlFor="name">Name</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="CREATED_AT" id="createdAt" />
							<Label htmlFor="createdAt">Created At</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="EXTENSION" id="extension" />
							<Label htmlFor="extension">Extension</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="MODIFIED_AT" id="modifiedAt" />
							<Label htmlFor="modifiedAt">Modified At (on disk)</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="PAGES" id="pages" />
							<Label htmlFor="pages">Pages</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="PATH" id="path" />
							<Label htmlFor="path">Path</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="SIZE" id="size" />
							<Label htmlFor="size">Size</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="STATUS" id="status" />
							<Label htmlFor="status">Status</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="UPDATED_AT" id="updatedAt" />
							<Label htmlFor="updatedAt">Updated At</Label>
						</View>
					</RadioGroup>
				</View>

				<View className="gap-3">
					<Label className="font-medium leading-6 text-foreground-muted">Metadata Field</Label>

					<RadioGroup
						value={field}
						onValueChange={(value) => handleSortFieldChanged(value, true)}
						className="squircle gap-0 rounded-lg border border-edge bg-background-surface"
					>
						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="TITLE" id="title" />
							<Label htmlFor="title">Title</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="AGE_RATING" id="ageRating" />
							<Label htmlFor="ageRating">Age Rating</Label>
						</View>

						<Divider />

						<View className="flex flex-row items-center gap-3 p-3">
							<RadioGroupItem value="NUMBER" id="number" />
							<Label htmlFor="number">Series Position</Label>
						</View>
					</RadioGroup>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
