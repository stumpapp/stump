import { useDirectoryListing } from '@stump/client'
import { Button, cn, Dialog, InputGroup, Label, RawSwitch, Text } from '@stump/components'
import { ArrowLeft, ChevronRight, CornerDownLeft, Folder, FolderX, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	isOpen: boolean
	onClose(): void
	startingPath?: string
	onPathChange(path: string | null): void
}

/**
 * A dialog for browsing the server's filesystem and picking a directory
 */
export default function DirectoryPickerModal({ isOpen, onClose, ...props }: Props) {
	const { t } = useTranslate()

	return (
		<Dialog open={isOpen} onOpenChange={(nowOpen) => !nowOpen && onClose()}>
			<Dialog.Content size="md" className="gap-4">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('title'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				{isOpen && <DirectoryPicker onClose={onClose} {...props} />}
			</Dialog.Content>
		</Dialog>
	)
}

type PickerProps = Omit<Props, 'isOpen'>

function DirectoryPicker({ onClose, startingPath, onPathChange }: PickerProps) {
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const showHiddenId = useId()

	const [showHidden, setShowHidden] = useState(false)
	const [initialPath] = useState(() => startingPath || undefined)

	const { t, translate } = useTranslate()
	const {
		errorMessage,
		isLoading,
		path,
		directories,
		canGoBack,
		setPath,
		goBack,
		canLoadMore,
		loadMore,
	} = useDirectoryListing({
		initialPath,
		ignoreParams: {
			ignoreFiles: true,
			ignoreHidden: !showHidden,
		},
	})

	const [draftPath, setDraftPath] = useState(path ?? '')

	// keep the input in sync when navigating via the list or back button
	useEffect(() => {
		setDraftPath(path ?? '')
	}, [path])

	const directoryList = useMemo(
		() => (showHidden ? directories : directories.filter((d) => !d.name.startsWith('.'))),
		[directories, showHidden],
	)

	/**
	 * scroll to the top of the list when the path changes
	 */
	useEffect(() => {
		virtuosoRef.current?.scrollToIndex({ index: 0 })
	}, [path])

	const isDraftDirty = draftPath.trim() !== (path ?? '')

	const submitDraft = useCallback(() => {
		const next = draftPath.trim()
		if (next && next !== path) {
			setPath(next)
		}
	}, [draftPath, path, setPath])

	const handleConfirm = useCallback(() => {
		if (errorMessage || !path) return
		onPathChange(path)
		onClose()
	}, [errorMessage, path, onPathChange, onClose])

	const onLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore()
		}
	}, [canLoadMore, loadMore])

	const renderList = () => {
		if (errorMessage) {
			return (
				<EmptyState icon={FolderX} title={t(getKey('unableToOpen'))} description={errorMessage} />
			)
		}

		if (isLoading && !directoryList.length) {
			return (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)
		}

		if (!directoryList.length) {
			return <EmptyState icon={Folder} title={t(getKey('noSubdirectories'))} />
		}

		return (
			<AutoSizer>
				{({ height, width }) => (
					<Virtuoso
						ref={virtuosoRef}
						className="overflow-x-hidden"
						style={{ height, width }}
						data={directoryList}
						itemContent={(idx, directory) => (
							<div
								className={cn('px-1.5 py-px', {
									'pt-1.5': idx === 0,
									'pb-1.5': idx === directoryList.length - 1,
								})}
							>
								<Button
									type="button"
									variant="ghost"
									className="gap-2 px-2 font-normal w-full justify-start"
									onClick={() => setPath(directory.path)}
								>
									<Folder className="text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate text-left">{directory.name}</span>
									<ChevronRight className="text-muted-foreground opacity-0 transition-opacity group-hover/button:opacity-100" />
								</Button>
							</div>
						)}
						endReached={onLoadMore}
						increaseViewportBy={5 * (320 / 3)}
					/>
				)}
			</AutoSizer>
		)
	}

	return (
		<>
			<div className="gap-2 flex items-center">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-9 shrink-0"
					disabled={!canGoBack}
					onClick={goBack}
					aria-label={t(getKey('goToParent'))}
				>
					<ArrowLeft />
				</Button>

				<InputGroup>
					<InputGroup.Input
						value={draftPath}
						placeholder={t(getKey('inputPlaceholder'))}
						spellCheck={false}
						autoComplete="off"
						aria-invalid={!!errorMessage}
						onChange={(e) => setDraftPath(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								submitDraft()
							} else if (e.key === 'Escape' && isDraftDirty) {
								e.stopPropagation()
								setDraftPath(path ?? '')
							}
						}}
					/>
					{isDraftDirty && (
						<InputGroup.Addon align="inline-end">
							<InputGroup.Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={submitDraft}
								aria-label={t(getKey('goToPath'))}
							>
								<CornerDownLeft />
							</InputGroup.Button>
						</InputGroup.Addon>
					)}
				</InputGroup>
			</div>

			<div className="h-80 overflow-hidden rounded-lg border border-border">{renderList()}</div>

			<Dialog.Footer className="sm:justify-between items-center">
				<div className="gap-2 sm:self-auto flex items-center self-start">
					<RawSwitch
						id={showHiddenId}
						checked={showHidden}
						onCheckedChange={setShowHidden}
						size="sm"
					/>
					<Label htmlFor={showHiddenId} className="text-sm font-normal text-muted-foreground">
						{t(getKey('showHiddenFiles'))}
					</Label>
				</div>

				<div className="gap-2 sm:flex-row flex flex-col-reverse">
					<Button type="button" variant="outline" onClick={onClose}>
						{translate('shared.common.cancel')}
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={!path || !!errorMessage || isDraftDirty}
					>
						{translate('shared.common.select')}
					</Button>
				</div>
			</Dialog.Footer>
		</>
	)
}

type EmptyStateProps = {
	icon: React.ComponentType<{ className?: string }>
	title: string
	description?: string
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
	return (
		<div className="gap-1.5 px-6 flex h-full flex-col items-center justify-center text-center">
			<Icon className="mb-1 h-6 w-6 text-muted-foreground" />
			<Text size="sm" className="font-medium">
				{title}
			</Text>
			{description && (
				<Text size="xs" variant="muted" className="max-w-sm wrap-break-word">
					{description}
				</Text>
			)}
		</div>
	)
}

const getKey = (key: string) => `directoryPicker.${key}`
