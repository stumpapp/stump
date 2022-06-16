import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import shallow from 'zustand/shallow';
import { useStore } from '~store/store';

export function useViewMode() {
	const location = useLocation();

	const { userPreferences, setLibraryViewMode, setSeriesViewMode } = useStore(
		({ userPreferences, setLibraryViewMode, setSeriesViewMode }) => ({
			userPreferences,
			setLibraryViewMode,
			setSeriesViewMode,
		}),
		shallow,
	);

	const { showViewOptions, viewAsGrid, onViewModeChange } = useMemo(() => {
		let _showViewOptions =
			location.pathname.match(/\/libraries\/.+$/) || location.pathname.match(/\/series\/.+$/);

		if (!_showViewOptions) {
			return {
				showViewOptions: false,
			};
		}

		let _viewAsGrid;
		let _onViewModeChange;

		if (location.pathname.match(/\/libraries\/.+$/)) {
			_viewAsGrid = userPreferences?.libraryViewMode === 'GRID';
			_onViewModeChange = setLibraryViewMode;
		} else if (location.pathname.match(/\/series\/.+$/)) {
			_viewAsGrid = userPreferences?.seriesViewMode === 'GRID';
			_onViewModeChange = setSeriesViewMode;
		}

		// safe guard, don't love it though
		if (_viewAsGrid == undefined || _onViewModeChange == undefined) {
			return {
				showViewOptions: false,
			};
		}

		return {
			showViewOptions: _showViewOptions,
			viewAsGrid: _viewAsGrid,
			onViewModeChange: _onViewModeChange,
		};
	}, [location.pathname, userPreferences]);

	return { showViewOptions, viewAsGrid, onViewModeChange };
}
