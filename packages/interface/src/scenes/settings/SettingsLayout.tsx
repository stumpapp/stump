import { useUserStore } from '@stump/client'
import { Divider, Heading, Text } from '@stump/components'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import SettingsNavigation from './SettingsNavigation'

export default function SettingsLayout() {
	const user = useUserStore((store) => store.user)

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	return (
		<div className="flex h-full w-full flex-col gap-2">
			<SettingsNavigation user={user} />
			<Suspense>
				<Outlet />
			</Suspense>
		</div>
	)
}

type SettingsContentProps = {
	children: React.ReactNode
}

export function SettingsContent({ children }: SettingsContentProps) {
	return (
		<>
			<Divider variant="muted" className="my-3.5" />
			<div className="mt-6 flex flex-col gap-12">{children}</div>
		</>
	)
}

type SettingsHeadingProps = {
	heading: string
	subtitle: string
}

export function SettingsHeading({ heading, subtitle }: SettingsHeadingProps) {
	return (
		<>
			<Heading>{heading}</Heading>
			<Text size="sm" variant="muted" className="mt-1">
				{subtitle}
			</Text>
		</>
	)
}
type SettingsSubSectionProps = SettingsContentProps & SettingsHeadingProps

export function SettingsSubSection({ heading, subtitle, children }: SettingsSubSectionProps) {
	return (
		<>
			<Heading size="xs">{heading}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{subtitle}
			</Text>

			<Divider variant="muted" className="my-3.5" />

			{children}
		</>
	)
}
