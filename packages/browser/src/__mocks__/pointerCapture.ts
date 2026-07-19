// @ts-expect-error: This is fine
window.PointerEvent = class PointerEvent extends MouseEvent {
	public isPrimary: boolean
	public pointerId: number
	public pointerType: string
	public width: number
	public height: number
	public pressure: number
	public tiltX: number
	public tiltY: number

	constructor(type: string, params: PointerEventInit = {}) {
		super(type, params)
		this.isPrimary = params.isPrimary ?? false
		this.pointerId = params.pointerId ?? 0
		this.pointerType = params.pointerType ?? 'mouse'
		this.width = params.width ?? 1
		this.height = params.height ?? 1
		this.pressure = params.pressure ?? 0
		this.tiltX = params.tiltX ?? 0
		this.tiltY = params.tiltY ?? 0
	}
}

window.HTMLElement.prototype.scrollIntoView = jest.fn()
window.HTMLElement.prototype.hasPointerCapture = jest.fn()
window.HTMLElement.prototype.releasePointerCapture = jest.fn()
window.HTMLElement.prototype.setPointerCapture = jest.fn()

// See https://github.com/testing-library/user-event/discussions/1087#discussioncomment-6302495
