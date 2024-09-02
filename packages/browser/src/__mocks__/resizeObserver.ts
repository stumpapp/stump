/* eslint-disable @typescript-eslint/no-empty-function */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// components will require this mock.
global.ResizeObserver = class FakeResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
