// components will require this mock.
global.ResizeObserver = class FakeResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
