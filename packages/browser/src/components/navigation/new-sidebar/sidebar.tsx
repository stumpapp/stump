import { Slot } from '@radix-ui/react-slot'
import { cn, SheetPrimitive, ToolTip } from '@stump/components'
import { cva, VariantProps } from 'class-variance-authority'
import { PanelLeft } from 'lucide-react'
import {
	ComponentProps,
	createContext,
	CSSProperties,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { useMediaMatch } from 'rooks'

// yoink <- https://ui.shadcn.com/docs/components/base/sidebar

// shad uses a cookie but that's a bit silly imo
const SIDEBAR_STORAGE_KEY = 'stump:sidebar_state'
const SIDEBAR_WIDTH = '14rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

type SidebarContextProps = {
	state: 'expanded' | 'collapsed'
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	isMobile: boolean
	toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

export function useSidebar() {
	const context = useContext(SidebarContext)
	if (!context) {
		throw new Error('useSidebar must be used within a Sidebar.Provider')
	}
	return context
}

const readStoredOpen = () => {
	try {
		return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'false'
	} catch {
		return true
	}
}

type SidebarProviderProps = ComponentProps<'div'> & {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

function SidebarProvider({
	defaultOpen,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: SidebarProviderProps) {
	const isMobile = !!useMediaMatch('(max-width: 768px)')
	const [openMobile, setOpenMobile] = useState(false)

	const [_open, _setOpen] = useState(() => defaultOpen ?? readStoredOpen())
	const open = openProp ?? _open
	const setOpen = useCallback(
		(value: boolean | ((value: boolean) => boolean)) => {
			const openState = typeof value === 'function' ? value(open) : value
			if (setOpenProp) {
				setOpenProp(openState)
			} else {
				_setOpen(openState)
			}
			try {
				localStorage.setItem(SIDEBAR_STORAGE_KEY, String(openState))
			} catch {
				// noop
			}
		},
		[setOpenProp, open],
	)

	const toggleSidebar = useCallback(
		() => (isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)),
		[isMobile, setOpen],
	)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				toggleSidebar()
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [toggleSidebar])

	useEffect(() => {
		if (!isMobile) setOpenMobile(false)
	}, [isMobile])

	const state = open ? 'expanded' : 'collapsed'

	const contextValue = useMemo<SidebarContextProps>(
		() => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
		[state, open, setOpen, isMobile, openMobile, toggleSidebar],
	)

	return (
		<SidebarContext.Provider value={contextValue}>
			<div
				data-slot="sidebar-wrapper"
				style={
					{
						'--sidebar-width': SIDEBAR_WIDTH,
						'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
						...style,
					} as CSSProperties
				}
				className={cn(
					'group/sidebar-wrapper min-h-0 flex h-full w-full flex-1 has-data-[variant=inset]:bg-sidebar',
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	)
}

// TODO: can prob expose these as preferences

type SidebarProps = ComponentProps<'div'> & {
	side?: 'left' | 'right'
	variant?: 'sidebar' | 'floating' | 'inset'
	collapsible?: 'offcanvas' | 'icon' | 'none'
	containerClassName?: string
}

function SidebarRoot({
	side = 'left',
	variant = 'sidebar',
	collapsible = 'offcanvas',
	className,
	containerClassName,
	children,
	...props
}: SidebarProps) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

	if (collapsible === 'none') {
		return (
			<div
				data-slot="sidebar"
				className={cn(
					'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
					className,
				)}
				{...props}
			>
				{children}
			</div>
		)
	}

	if (isMobile) {
		return (
			<SheetPrimitive open={openMobile} onOpenChange={setOpenMobile}>
				<SheetPrimitive.Content
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					position={side}
					size="content"
					className="p-0 gap-0 w-(--sidebar-width) border-sidebar-border bg-sidebar text-sidebar-foreground"
					style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as CSSProperties}
				>
					<SheetPrimitive.Title className="sr-only">Sidebar</SheetPrimitive.Title>
					<SheetPrimitive.Description className="sr-only">
						Displays the mobile sidebar.
					</SheetPrimitive.Description>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetPrimitive.Content>
			</SheetPrimitive>
		)
	}

	const isFloatingOrInset = variant === 'floating' || variant === 'inset'

	return (
		<div
			className={cn(
				'group peer md:block hidden shrink-0 text-sidebar-foreground',
				'relative h-full w-(--sidebar-width) transition-[width] duration-200 ease-linear data-[collapsible=offcanvas]:overflow-hidden',
				'data-[collapsible=offcanvas]:w-0',
				isFloatingOrInset
					? 'data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
					: 'data-[collapsible=icon]:w-(--sidebar-width-icon)',
				containerClassName,
			)}
			data-state={state}
			data-collapsible={state === 'collapsed' ? collapsible : ''}
			data-variant={variant}
			data-side={side}
			data-slot="sidebar"
		>
			<div
				data-slot="sidebar-container"
				className={cn(
					'inset-y-0 absolute flex h-full transition-[left,right,width] duration-200 ease-linear',
					isFloatingOrInset && 'group-data-[collapsible=offcanvas]:p-0',
					side === 'left'
						? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
						: 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
					isFloatingOrInset
						? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
					'border-sidebar-border',
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className={cn(
						'flex h-full w-full flex-col bg-sidebar',
						'group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border',
						className,
					)}
				>
					{children}
				</div>
			</div>
		</div>
	)
}

function SidebarTrigger({ className, onClick, ...props }: ComponentProps<'button'>) {
	const { toggleSidebar } = useSidebar()

	return (
		<button
			type="button"
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			className={cn(
				'size-7 inline-flex shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
				className,
			)}
			onClick={(event) => {
				onClick?.(event)
				toggleSidebar()
			}}
			{...props}
		>
			<PanelLeft className="size-4" />
			<span className="sr-only">Toggle Sidebar</span>
		</button>
	)
}

function SidebarRail({ className, ...props }: ComponentProps<'button'>) {
	const { toggleSidebar } = useSidebar()

	return (
		<button
			type="button"
			data-sidebar="rail"
			data-slot="sidebar-rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			className={cn(
				'inset-y-0 w-4 sm:flex group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:inset-y-0 absolute z-20 hidden -translate-x-1/2 transition-all ease-linear after:absolute after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border',
				'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
				'[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
				'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
				'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
				className,
			)}
			{...props}
		/>
	)
}

const SidebarInset = forwardRef<HTMLElement, ComponentProps<'main'>>(
	({ className, ...props }, ref) => (
		<main
			ref={ref}
			data-slot="sidebar-inset"
			className={cn(
				'min-w-0 relative flex w-full flex-1 flex-col bg-background',
				'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-sidebar-border md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className,
			)}
			{...props}
		/>
	),
)
SidebarInset.displayName = 'SidebarInset'

function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn('gap-2 p-2 flex flex-col', className)}
			{...props}
		/>
	)
}

function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn('gap-2 p-2 flex flex-col', className)}
			{...props}
		/>
	)
}

function SidebarSeparator({ className, ...props }: ComponentProps<'hr'>) {
	return (
		<hr
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn('mx-2 w-auto border-sidebar-border', className)}
			{...props}
		/>
	)
}

function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				'gap-2 min-h-0 scrollbar-hide flex flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-group"
			data-sidebar="group"
			className={cn('p-2 min-w-0 relative flex w-full flex-col', className)}
			{...props}
		/>
	)
}

function SidebarGroupLabel({
	className,
	asChild = false,
	...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'div'

	return (
		<Comp
			data-slot="sidebar-group-label"
			data-sidebar="group-label"
			className={cn(
				'h-8 px-2 text-xs font-medium [&>svg]:size-4 flex shrink-0 items-center rounded-md text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:shrink-0',
				'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarGroupAction({
	className,
	asChild = false,
	...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			data-slot="sidebar-group-action"
			data-sidebar="group-action"
			className={cn(
				'top-3.5 right-3 p-0 w-5 [&>svg]:size-4 absolute flex aspect-square items-center justify-center rounded-md text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:shrink-0',
				'after:-inset-2 md:after:hidden after:absolute',
				'group-data-[collapsible=icon]:hidden',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarGroupContent({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-group-content"
			data-sidebar="group-content"
			className={cn('text-sm w-full', className)}
			{...props}
		/>
	)
}

function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="sidebar-menu"
			data-sidebar="menu"
			className={cn('gap-1 min-w-0 flex w-full flex-col', className)}
			{...props}
		/>
	)
}

function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
	return (
		<li
			data-slot="sidebar-menu-item"
			data-sidebar="menu-item"
			className={cn('group/menu-item relative', className)}
			{...props}
		/>
	)
}

const sidebarMenuButtonVariants = cva(
	'peer/menu-button gap-2 p-2 text-sm flex w-full items-center overflow-hidden rounded-md text-left text-sidebar-foreground ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0',
	{
		defaultVariants: {
			size: 'default',
			variant: 'default',
		},
		variants: {
			size: {
				default: 'h-8 text-sm',
				lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
				sm: 'h-7 text-xs',
			},
			variant: {
				default: '',
				outline:
					'border border-dashed border-sidebar-border bg-transparent hover:bg-sidebar-accent/40',
			},
		},
	},
)

type SidebarMenuButtonProps = ComponentProps<'button'> & {
	asChild?: boolean
	isActive?: boolean
	tooltip?: string
} & VariantProps<typeof sidebarMenuButtonVariants>

function SidebarMenuButton({
	asChild = false,
	isActive = false,
	variant = 'default',
	size = 'default',
	tooltip,
	className,
	...props
}: SidebarMenuButtonProps) {
	const Comp = asChild ? Slot : 'button'
	const { isMobile, state } = useSidebar()

	const button = (
		<Comp
			data-slot="sidebar-menu-button"
			data-sidebar="menu-button"
			data-size={size}
			data-active={isActive}
			className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
			{...props}
		/>
	)

	if (!tooltip) {
		return button
	}

	return (
		<ToolTip
			content={tooltip}
			side="right"
			align="center"
			isDisabled={state !== 'collapsed' || isMobile}
		>
			{button}
		</ToolTip>
	)
}

function SidebarMenuAction({
	className,
	asChild = false,
	showOnHover = false,
	...props
}: ComponentProps<'button'> & {
	asChild?: boolean
	showOnHover?: boolean
}) {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			data-slot="sidebar-menu-action"
			data-sidebar="menu-action"
			className={cn(
				'right-1 p-0 w-5 [&>svg]:size-4 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 absolute flex aspect-square items-center justify-center rounded-md text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:shrink-0',
				'after:-inset-2 md:after:hidden after:absolute',
				'group-data-[collapsible=icon]:hidden',
				showOnHover &&
					'md:opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarMenuBadge({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-menu-badge"
			data-sidebar="menu-badge"
			className={cn(
				'right-1 h-5 px-1 text-xs font-medium min-w-5 pointer-events-none absolute flex items-center justify-center rounded-md text-sidebar-foreground tabular-nums select-none',
				'peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
				'group-data-[collapsible=icon]:hidden',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarMenuSub({ className, ...props }: ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="sidebar-menu-sub"
			data-sidebar="menu-sub"
			className={cn(
				'mx-3.5 gap-1 px-2.5 py-0.5 min-w-0 flex translate-x-px flex-col border-l border-sidebar-border',
				'group-data-[collapsible=icon]:hidden',
				className,
			)}
			{...props}
		/>
	)
}

function SidebarMenuSubItem({ className, ...props }: ComponentProps<'li'>) {
	return (
		<li
			data-slot="sidebar-menu-sub-item"
			data-sidebar="menu-sub-item"
			className={cn('group/menu-sub-item relative', className)}
			{...props}
		/>
	)
}

function SidebarMenuSubButton({
	asChild = false,
	size = 'md',
	isActive = false,
	className,
	...props
}: ComponentProps<'a'> & {
	asChild?: boolean
	size?: 'sm' | 'md'
	isActive?: boolean
}) {
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			data-slot="sidebar-menu-sub-button"
			data-sidebar="menu-sub-button"
			data-size={size}
			data-active={isActive}
			className={cn(
				'h-7 gap-2 px-2 min-w-0 [&>svg]:size-4 flex -translate-x-px items-center overflow-hidden rounded-md text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0',
				'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
				size === 'sm' && 'text-xs',
				size === 'md' && 'text-sm',
				'group-data-[collapsible=icon]:hidden',
				className,
			)}
			{...props}
		/>
	)
}

type SidebarComponent = typeof SidebarRoot & {
	Provider: typeof SidebarProvider
	Trigger: typeof SidebarTrigger
	Rail: typeof SidebarRail
	Inset: typeof SidebarInset
	Header: typeof SidebarHeader
	Footer: typeof SidebarFooter
	Separator: typeof SidebarSeparator
	Content: typeof SidebarContent
	Group: typeof SidebarGroup
	GroupLabel: typeof SidebarGroupLabel
	GroupAction: typeof SidebarGroupAction
	GroupContent: typeof SidebarGroupContent
	Menu: typeof SidebarMenu
	MenuItem: typeof SidebarMenuItem
	MenuButton: typeof SidebarMenuButton
	MenuAction: typeof SidebarMenuAction
	MenuBadge: typeof SidebarMenuBadge
	MenuSub: typeof SidebarMenuSub
	MenuSubItem: typeof SidebarMenuSubItem
	MenuSubButton: typeof SidebarMenuSubButton
}

export const Sidebar = Object.assign(SidebarRoot, {
	Provider: SidebarProvider,
	Trigger: SidebarTrigger,
	Rail: SidebarRail,
	Inset: SidebarInset,
	Header: SidebarHeader,
	Footer: SidebarFooter,
	Separator: SidebarSeparator,
	Content: SidebarContent,
	Group: SidebarGroup,
	GroupLabel: SidebarGroupLabel,
	GroupAction: SidebarGroupAction,
	GroupContent: SidebarGroupContent,
	Menu: SidebarMenu,
	MenuItem: SidebarMenuItem,
	MenuButton: SidebarMenuButton,
	MenuAction: SidebarMenuAction,
	MenuBadge: SidebarMenuBadge,
	MenuSub: SidebarMenuSub,
	MenuSubItem: SidebarMenuSubItem,
	MenuSubButton: SidebarMenuSubButton,
}) as SidebarComponent

export type { SidebarProps }
