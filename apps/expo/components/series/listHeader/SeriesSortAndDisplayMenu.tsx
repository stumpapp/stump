import { SeriesMetadataModelOrdering, SeriesModelOrdering, SeriesOrderBy } from '@stump/graphql'
import { Stack, useNavigation } from 'expo-router'
import clone from 'lodash/cloneDeep'
import set from 'lodash/set'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { match, P } from 'ts-pattern'

import { useTranslate } from '~/lib/hooks'
import { useSeriesFilterStore } from '~/stores/filters'

// this is kinda annoying, but Stack.Toolbar seems to be VERY strict
// about children, effectively checking whether the direct child is e.g.
// a Stack.Toolbar.Menu, and if not, it just doesn't render anything. so composability
// is shit, hopefully this gets better over time. for now, the hook renders the inline
// jsx which should work, but something like <SeriesSortAndDisplayMenu /> would not be
// recognized as valid

export function useSeriesSortAndDisplayMenu() {
	const { t } = useTranslate()

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			// navigation.setOptions({
			// 	// headerRight: () => <SeriesSortAndDisplayMenu />,
			// })
		}
	}, [navigation])

	// todo: prolly make a separate hook for the setter callbacks to share between menus
	const sort = useSeriesFilterStore((store) => store.sort)
	const setSort = useSeriesFilterStore((store) => store.setSort)

	const sortConfig = match(sort)
		.with({ series: P.not(P.nullish) }, ({ series: { field, direction } }) => ({
			field,
			direction,
		}))
		.with({ metadata: P.not(P.nullish) }, ({ metadata: { field, direction } }) => ({
			field,
			direction,
		}))
		.otherwise(() => ({ field: 'NAME', direction: 'ASC' }))

	const onSortFieldPress = (field: string, isMetadata: boolean) => {
		const adjustedConfig = clone(sortConfig)

		if (field === sortConfig.field) {
			set(adjustedConfig, 'direction', sortConfig.direction === 'ASC' ? 'DESC' : 'ASC')
		} else {
			set(adjustedConfig, 'field', field)
			set(adjustedConfig, 'direction', 'ASC')
		}

		const adjustedSort = isMetadata
			? ({
					metadata: {
						field: adjustedConfig.field as SeriesMetadataModelOrdering,
						direction: adjustedConfig.direction,
					},
				} as SeriesOrderBy)
			: ({
					series: {
						field: adjustedConfig.field as SeriesModelOrdering,
						direction: adjustedConfig.direction,
					},
				} as SeriesOrderBy)

		setSort(adjustedSort)
	}

	const getSubtitle = (field: string) => {
		if (field !== sortConfig.field) return undefined
		if (['DATE_ADDED', 'PUBLISHED_YEAR'].includes(field)) {
			return t(`sorting.sortDirectionDate.${sortConfig.direction}`)
		}
		// for now only strings are left
		return t(`sorting.sortDirectionString.${sortConfig.direction}`)
	}

	// todo: support list
	if (Platform.OS === 'ios') {
		return (
			<Stack.Toolbar.Menu icon="ellipsis">
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction icon="rectangle.grid.2x2" disabled isOn>
						{t('common.grid')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction icon="list.bullet" disabled>
						{t('common.list')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.Menu inline title={t('sorting.labelEllipsis')}>
					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'NAME'}
						subtitle={getSubtitle('NAME')}
						onPress={() => onSortFieldPress('NAME', false)}
					>
						{t('sorting.sortField.NAME')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'CREATED_AT'}
						subtitle={getSubtitle('CREATED_AT')}
						onPress={() => onSortFieldPress('CREATED_AT', false)}
					>
						{t('sorting.sortField.CREATED_AT')}
					</Stack.Toolbar.MenuAction>

					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'YEAR'}
						subtitle={getSubtitle('YEAR')}
						onPress={() => onSortFieldPress('YEAR', true)}
					>
						{t('sorting.sortField.YEAR')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		)
	}

	return null
}

function AndroidMenu() {}
