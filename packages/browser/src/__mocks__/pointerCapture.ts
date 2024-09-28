// @ts-expect-error: This is fine
window.PointerEvent = class PointerEvent extends Event {}

window.HTMLElement.prototype.scrollIntoView = jest.fn()
window.HTMLElement.prototype.hasPointerCapture = jest.fn()
window.HTMLElement.prototype.releasePointerCapture = jest.fn()
window.HTMLElement.prototype.setPointerCapture = jest.fn()

// See https://github.com/testing-library/user-event/discussions/1087#discussioncomment-6302495
