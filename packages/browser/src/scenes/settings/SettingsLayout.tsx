import { cn, cx } from '@stump/components'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { Container } from '@/components/container'
import { usePreferences } from '@/hooks'
import { useUserStore } from '@/stores'

import SettingsHeader from './SettingsHeader'
import SettingsSideBar from './SettingsSideBar'

export default function SettingsLayout() {
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { user } = useUserStore((store) => ({
		user: store.user,
	}))
	const {
		preferences: {
			enableDoubleSidebar,
			primaryNavigationMode,
			layoutMaxWidthPx,
			enableHideScrollbar,
		},
	} = usePreferences()

	if (!user) {
		return <Navigate to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	const displaySideBar = !!enableDoubleSidebar && !isMobile
	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	// 1. if we are on mobile, we always render it
	// 2. if not displaySideBar, we always render it
	// 3. if topbar, never render it TODO: this is a bit weird UX, let's make this a setting
	const renderNavigation = isMobile || (!displaySideBar && !preferTopBar)

	return (
		<div
			// The overflow on the parent is intentional, as it allows the native scrollbar to be fully
			// to the right, instead of on the potentially restricted width of the child container
			className={cn('flex h-full w-full flex-col overflow-y-auto md:flex-row', {
				'scrollbar-hide': enableHideScrollbar,
			})}
		>
			<div
				className={cn('flex w-full flex-col md:flex-row', {
					'mx-auto': preferTopBar && !!layoutMaxWidthPx,
				})}
				style={{
					maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
				}}
			>
				{displaySideBar && <SettingsSideBar />}
				<div
					className={cx('w-full flex-1 flex-col', {
						'pl-48': displaySideBar,
					})}
				>
					<SettingsHeader renderNavigation={renderNavigation} />
					<Container disableHorizontalPadding>
						<Suspense fallback={null}>
							<Outlet />
						</Suspense>
					</Container>
				</div>
			</div>
		</div>
	)
}
