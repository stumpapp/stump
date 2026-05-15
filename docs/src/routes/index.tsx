import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'

import LandingPage from '@/components/landing'
import { baseOptions } from '@/lib/layout.shared'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	return (
		<HomeLayout {...baseOptions()}>
			<LandingPage />
		</HomeLayout>
	)
}
