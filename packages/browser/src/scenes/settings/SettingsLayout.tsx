import { usePreferences } from '@/hooks'
import { cn, cx } from '@stump/components'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { Container } from '@/components/container'
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
			enable_double_sidebar,
			primary_navigation_mode,
			layout_max_width_px,
			enable_hide_scrollbar,
		},
	} = usePreferences()

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	const displaySideBar = !!enable_double_sidebar && !isMobile
	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	// 1. if we are on mobile, we always render it
	// 2. if not displaySideBar, we always render it
	// 3. if topbar, never render it
	const renderNavigation = isMobile || (!displaySideBar && !preferTopBar)

	return (
		<div
			// The overfloy on the parent is intentional, as it allows the native scrollbar to be fully
			// to the right, instead of on the potentially restricted width of the child container
			className={cn('flex h-full w-full flex-col overflow-y-auto md:flex-row', {
				'scrollbar-hide': enable_hide_scrollbar,
			})}
		>
			<div
				className={cn('flex w-full flex-col md:flex-row', {
					'mx-auto': preferTopBar && !!layout_max_width_px,
				})}
				style={{
					maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
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
