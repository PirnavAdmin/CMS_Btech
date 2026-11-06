// Browser APIs missing from jsdom. These are test shims, never application data.
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }

if (!HTMLElement.prototype.scrollTo) HTMLElement.prototype.scrollTo = function ({ left = 0, top = 0 } = {}) { this.scrollLeft = left; this.scrollTop = top }

window.scrollTo = () => {}
