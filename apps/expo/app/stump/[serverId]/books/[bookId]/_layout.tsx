import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Platform } from 'react-native'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { DerivedColorPaletteProvider } from '~/providers/DerivedColorPalette'
import { usePreferencesStore } from '~/stores'

const query = graphql(`
	query BookByIdStackLayout($bookId: ID!) {
		mediaById(id: $bookId) {
			id
			thumbnail {
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
			}
		}
	}
`)

export default function Screen() {
	const disableDismissGesture = usePreferencesStore((store) => store.disableDismissGesture)

	const { bookId } = useLocalSearchParams<{ bookId: string }>()
	const { data } = useGraphQL(query, ['mediaById', bookId, 'bookByIdStackLayout'], {
		bookId,
	})
	const imageMetadata = data?.mediaById?.thumbnail?.metadata

	// TODO: depending on how we go about this, might not want the provider this high up in the tree,
	// since if it is used in some components (like card) it might mess with the overview which we don't
	// want. Maybe a `shouldUseDerivedPalette` where needed? idk, a bit verbose
	return (
		<DerivedColorPaletteProvider imageMetadata={imageMetadata}>
			<Stack
				screenOptions={{
					headerShown: false,
					presentation:
						disableDismissGesture && Platform.OS === 'ios' ? 'fullScreenModal' : undefined,
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						headerTitle: '',
						headerShown: Platform.OS === 'ios',
						headerTransparent: true,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						headerLeft: () => <BackLink />,
					}}
				/>
			</Stack>
		</DerivedColorPaletteProvider>
	)
}
