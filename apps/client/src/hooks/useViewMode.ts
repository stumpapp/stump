import { ViewMode } from '@stump/core';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from './useUser';

export function useViewMode() {
	const location = useLocation();

	const { preferences, updatePreferences } = useUser();

	function setLibraryViewMode(viewMode: ViewMode) {
		if (preferences) {
			updatePreferences({ ...preferences, libraryViewMode: viewMode });
		}
	}

	function setSeriesViewMode(viewMode: ViewMode) {
		if (preferences) {
			updatePreferences({ ...preferences, seriesViewMode: viewMode });
		}
	}

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
			_viewAsGrid = preferences?.libraryViewMode === 'GRID';
			_onViewModeChange = setLibraryViewMode;
		} else if (location.pathname.match(/\/series\/.+$/)) {
			_viewAsGrid = preferences?.seriesViewMode === 'GRID';
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
	}, [location.pathname, preferences]);

	return { showViewOptions, viewAsGrid, onViewModeChange };
}
