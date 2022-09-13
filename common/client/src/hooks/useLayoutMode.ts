import { useMemo } from 'react';
import { useUserStore } from '../stores';

export type LayoutMode = 'GRID' | 'LIST';
export type LayoutEntity = 'LIBRARY' | 'SERIES';

const DEFAULT_LAYOUT_MODE: LayoutMode = 'GRID';

export function useLayoutMode(entity: LayoutEntity) {
	const { userPreferences } = useUserStore();

	const layoutMode = useMemo(() => {
		if (!userPreferences) {
			return DEFAULT_LAYOUT_MODE;
		}

		switch (entity) {
			case 'LIBRARY':
				return userPreferences.libraryViewMode || DEFAULT_LAYOUT_MODE;
			case 'SERIES':
				return userPreferences.seriesViewMode || DEFAULT_LAYOUT_MODE;
			default:
				console.warn('Unknown layout entity', entity);
				return DEFAULT_LAYOUT_MODE;
		}
	}, [entity, userPreferences]);

	return { layoutMode };
}
