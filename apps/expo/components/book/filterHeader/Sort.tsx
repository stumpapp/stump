import { MediaOrderBy } from '@stump/graphql'
import { useCallback } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { Heading, Label, RadioGroup, RadioGroupItem, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useBookFilterStore } from '~/stores/filters'

import FilterSheet from './FilterSheet'

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

	return (
		<FilterSheet label="Sort" isActive>
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
						className="gap-0 rounded-lg border border-edge bg-background-surface"
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

					{/* Media: */}
					{/* NAME
          SIZE
          EXTENSION
          PAGES
          UPDATED_AT
          CREATED_AT
          MODIFIED_AT
          HASH
          KOREADER_HASH
          PATH
          STATUS
          SERIES_ID */}

					<RadioGroup
						value={field}
						onValueChange={() => {}}
						className="gap-0 rounded-lg border border-edge bg-background-surface"
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

				{/* Media Metadata */}
				{/* 
          AGE_RATING
          CHARACTERS
          COLORISTS
          COVER_ARTISTS
          DAY
          EDITORS
          GENRES
          IDENTIFIER_AMAZON
          IDENTIFIER_CALIBRE
          IDENTIFIER_GOOGLE
          IDENTIFIER_ISBN
          IDENTIFIER_MOBI_ASIN
          IDENTIFIER_UUID
          INKERS
          LANGUAGE
          LETTERERS
          LINKS
          MONTH
          NOTES
          NUMBER
          PAGE_COUNT
          PENCILLERS
          PUBLISHER
          SERIES
          SUMMARY
          TEAMS
          TITLE
          TITLE_SORT
          VOLUME
          WRITERS */}

				<View className="gap-3">
					<Label className="font-medium leading-6 text-foreground-muted">Metadata Field</Label>

					<RadioGroup
						value="NAME"
						onValueChange={() => {}}
						className="gap-0 rounded-lg border border-edge bg-background-surface"
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
					</RadioGroup>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
