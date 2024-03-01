import React from 'react'

import { ScreenRootView } from '@/components/primitives'

type Props = {
	children: React.ReactNode
}
export default function ReaderContainer({ children }: Props) {
	return <ScreenRootView>{children}</ScreenRootView>
}
