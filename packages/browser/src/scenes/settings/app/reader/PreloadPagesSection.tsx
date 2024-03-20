import { Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useReaderStore } from '@/stores'

export default function PreloadPagesSection() {
	const { t } = useLocaleContext()

	const { preloadAheadCount, preloadBehindCount, setPreloadAheadCount, setPreloadBehindCount } =
		useReaderStore((state) => ({
			preloadAheadCount: state.preloadAheadCount,
			preloadBehindCount: state.preloadBehindCount,
			setPreloadAheadCount: state.setPreloadAheadCount,
			setPreloadBehindCount: state.setPreloadBehindCount,
		}))

	const createChangeHandler =
		(updater: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value

			if (!value) {
				return updater(0)
			}

			const parsed = parseInt(value)
			if (!isNaN(parsed) && parsed >= 0) {
				return updater(parsed)
			}
		}

	return (
		<>
			<div className="flex flex-col gap-y-1.5 md:max-w-md">
				<Input
					label={t(getKey('preloadAheadCount.label'))}
					description={t(getKey('preloadAheadCount.description'))}
					value={preloadAheadCount}
					onChange={createChangeHandler(setPreloadAheadCount)}
					type="number"
					min={0}
					variant="primary"
				/>
			</div>

			<div className="flex flex-col gap-y-1.5 md:max-w-md">
				<Input
					label={t(getKey('preloadBehindCount.label'))}
					description={t(getKey('preloadBehindCount.description'))}
					value={preloadBehindCount}
					onChange={createChangeHandler(setPreloadBehindCount)}
					type="number"
					min={0}
					variant="primary"
				/>
			</div>
		</>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.imageBasedBooks.sections'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
