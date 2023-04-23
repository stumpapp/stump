import React, { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'

export const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)
const OnBoardingScene = lazily(() => import('./OnBoardingScene'))

export default function OnBoardingRouter() {
	return (
		<Suspense>
			<Routes>
				<Route path="/" element={<OnBoardingScene />} />
			</Routes>
		</Suspense>
	)
}
