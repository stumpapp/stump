import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

const OnBoardingScene = lazy(() => import('./OnBoardingScene'))

export default function OnBoardingRouter() {
	return (
		<Suspense>
			<Routes>
				<Route path="/" element={<OnBoardingScene />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Suspense>
	)
}
