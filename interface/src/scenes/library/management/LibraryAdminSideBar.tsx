import { Heading, Label, Text } from '@stump/components'
import { useLocation } from 'react-router'

import { useLocaleContext } from '../../../i18n'
import { useLibraryAdminContext } from './context'

/**
 * Component that renders the sidebar for the library admin pages. Mostly,
 * this will just showcase a preview of the resolved library, either a completely
 * new library or an existing library that is being edited.
 */
export default function LibraryAdminSideBar() {
	const { t } = useLocaleContext()
	const { libraryPreview } = useLibraryAdminContext()

	const location = useLocation()
	const isEditingLibrary = location.pathname.includes('/edit')

	const renderPattern = () => {
		const pattern = libraryPreview?.library_options?.library_pattern
			?.split('_')
			.map((p) => p[0]?.toUpperCase() + p.slice(1).toLocaleLowerCase())
			.join(' ')

		if (!pattern) {
			return null
		}

		return (
			<Text size="xs" className="italic">
				{pattern} Library
			</Text>
		)
	}

	const renderBasicInfo = () => {
		const hasAtLeastOne = libraryPreview.name || libraryPreview.description || libraryPreview.path

		if (!hasAtLeastOne) {
			return null
		}

		return (
			<div className="flex flex-col gap-1.5 py-3">
				<Text size="sm" className="mb-1 font-semibold">
					{libraryPreview.name}
				</Text>
				{renderPattern()}
				{libraryPreview.description && (
					<div>
						<Label className="text-xs">Description</Label>
						<Text size="xs" className="mt-0.5">
							{libraryPreview.description}
						</Text>
					</div>
				)}
				{libraryPreview.path && (
					<div>
						<Label className="text-xs">Path</Label>
						<Text size="xs" variant="muted" className="mt-0.5 break-all">
							{libraryPreview.path}
						</Text>
					</div>
				)}
			</div>
		)
	}

	const renderOptions = () => {
		return null
		return (
			<div className="flex flex-col gap-1.5 py-3">
				{/* {createThumbnails && (
					<>
						<Label className="text-xs">Generate Thumbnails</Label>
						<Text size="xs" variant="muted">
							WEBP (lossless)
						</Text>
					</>
				)} */}
			</div>
		)
	}

	const renderTags = () => {
		if (!libraryPreview.tags?.length) {
			return null
		}

		return (
			<div className="py-3">
				<Text size="sm" className="mb-1 font-semibold">
					Tags
				</Text>
				TODO: haha oops
			</div>
		)
	}

	return (
		<aside className="hidden h-full lg:fixed lg:flex lg:flex-col">
			<div className="relative z-10 flex h-full w-[14rem] flex-1 shrink-0 flex-col gap-4 border-r border-gray-75 p-4 dark:border-gray-850/70">
				<Heading size="xs">{t('adminLibrarySidebar.libraryConfiguration.heading')}</Heading>
				<nav className="flex h-full w-full flex-1 flex-col gap-4">
					<Text size="xs" variant="muted">
						{t(
							`adminLibrarySidebar.libraryConfiguration.subtitle${
								isEditingLibrary ? 'Editing' : 'Creating'
							}`,
						)}
					</Text>

					<div className="flex flex-col divide-y divide-gray-75 dark:divide-gray-800">
						{renderBasicInfo()}
						{renderOptions()}
						{renderTags()}
					</div>
				</nav>
			</div>
		</aside>
	)
}
