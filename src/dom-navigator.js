/**
 * @module dom-navigator
 * @description
 * Module started as a fork of Rubens Mariuzzo's dom-navigator
 * https://github.com/rmariuzzo/dom-navigator
 */
import u from './utils/html';


/**
 * Unbox an object from jQuery or an array.
 *
 * @param {jQuery|Array|Element} obj The object to unbox.
 *
 * @return {Element} An element.
 */
function unboxElement(obj) {
    if (Array.isArray(obj)) {
        return obj[0];
    }
    return obj;
}

/**
 * Indicates if a given element is fully visible in the viewport.
 *
 * @param {Element} el The element to check.
 *
 * @return {Boolean} True if the given element is fully visible in the viewport, otherwise false.
 */
function inViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
}

/**
 * Return the absolute offset top of an element.
 * @param el {Element} The element.
 * @return {Number} The offset top.
 */
function absoluteOffsetTop(el) {
    let offsetTop = 0;
    do {
        if (!isNaN(el.offsetTop)) {
            offsetTop += el.offsetTop;
        }
    } while ((el = el.offsetParent));
    return offsetTop;
}

/**
 * Return the absolute offset left of an element.
 * @param el {Element} The element.
 * @return {Number} The offset left.
 */
function absoluteOffsetLeft(el) {
    let offsetLeft = 0;
    do {
        if (!isNaN(el.offsetLeft)) {
            offsetLeft += el.offsetLeft;
        }
    } while ((el = el.offsetParent));
    return offsetLeft;
}


class DOMNavigator {
    /**
     * Directions.
     * @returns {{left: string, up: string, right: string, down: string}}
     * @constructor
     */
    static get DIRECTION () {
        return {
            left: 'left',
            up: 'up',
            right: 'right',
            down: 'down'
        };
    }

    /**
     * Navigation modes.
     * @returns {{auto: string, horizontal: string, vertical: string, grid: string}}
     * @constructor
     */
    static get MODE () {
        return {
            auto: 'auto',
            horizontal: 'horizontal',
            vertical: 'vertical',
            grid: 'grid'
        };
    }

    /**
     * Default options.
     * @returns {{mode: string, selected: string, left: number, up: number, right: number, down: number, cols: number}}
     * @constructor
     */
    static get DEFAULTS () {
        return {
            mode: DOMNavigator.MODE.auto,
            selected: 'selected',
            left: 37,
            up: 38,
            right: 39,
            down: 40,
            cols: 0
        };
    }

    /**
     * Create a new DOM Navigator.
     * @param container {Element} The container of the element to navigate.
     * @param options {Object} The options to configure the DOM navigator.
     */
    constructor(container, options) {
        this.doc = window.document;
        this.container = container;
        this.options = Object.assign({}, DOMNavigator.DEFAULTS, options);
        this.init();
    }

    /**
     * Initialize the navigator.
     */
    init () {
        this.validateOptions();
        this.selected = null;
        this.keydownHandler = null;

        // Create hotkeys map.
        this.keys = {};
        this.keys[this.options.left] = this.left;
        this.keys[this.options.up] = this.up;
        this.keys[this.options.right] = this.right;
        this.keys[this.options.down] = this.down;

        // Calculate cols if needed for grid mode.
        if (this.options.mode === DOMNavigator.MODE.grid && !this.options.cols) {
            const els = this.elements();
            const count = [];
            for (let i = 0; i < els.length; i++) {
                if (i > 0 && count[i - 1] !== els[i].offsetTop) {
                    break;
                }
                count[i] = els[i].offsetTop;
            }
            this.options.cols = count.length;
        }
    }

    /**
     * Validate current options.
     */
    validateOptions () {
        const validMode = Object.keys(DOMNavigator.MODE).reduce((result, m) => (result || this.options.mode === DOMNavigator.MODE[m]));
        if (!validMode) {
            throw new Error('Unsupported navigation mode: ' + this.options.mode);
        }
    }

    /**
     * Enable this navigator.
     */
    enable () {
        this.keydownHandler = event => this.handleKeydown(event);
        this.doc.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Disable this navigator.
     */
    disable () {
        if (this.keydownHandler) {
            this.doc.removeEventListener('keydown', this.keydownHandler);
        }
    }

    /**
     * Destroy this navigator removing any event registered and any other data.
     */
    destroy () {
        this.disable();
        if (this.container.domNavigator) {
            delete this.container.domNavigator;
        }
    }

    /**
     * Navigate left to the next element if any.
     */
    left () {
        let next = null;

        switch (this.options.mode) {

            case DOMNavigator.MODE.auto:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }
                let left = this.selected.offsetLeft - 1;
                let top = this.selected.offsetTop;

                next = this.elementsBefore(left, Infinity).reduce((prev, curr) => {
                    let currDistance = Math.abs(left - curr.offsetLeft) + Math.abs(top - curr.offsetTop);
                    if (currDistance < prev.distance) {
                        return {
                            distance: currDistance,
                            element: curr
                        };
                    }
                    return prev;
                }, {
                    distance: Infinity
                });
                next = next.element;
                break;

            case DOMNavigator.MODE.horizontal:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected.previousElementSibling;
                break;

            case DOMNavigator.MODE.vertical:
                break;

            case DOMNavigator.MODE.grid:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                let index = this.elements().indexOf(this.selected);
                if (index % this.options.cols !== 0) {
                    next = this.selected.previousElementSibling;
                }

                break;
        }

        this.select(next, DOMNavigator.DIRECTION.left);
    }

    /**
     * Navigate up to the next element if any.
     */
    up () {
        let next = null;

        switch (this.options.mode) {

            case DOMNavigator.MODE.auto:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                let left = this.selected.offsetLeft;
                let top = this.selected.offsetTop - 1;

                next = this.elementsBefore(Infinity, top).reduce((prev, curr) => {
                    let currDistance = Math.abs(left - curr.offsetLeft) + Math.abs(top - curr.offsetTop);
                    if (currDistance < prev.distance) {
                        return {
                            distance: currDistance,
                            element: curr
                        };
                    }
                    return prev;
                }, {
                    distance: Infinity
                });
                next = next.element;
                break;

            case DOMNavigator.MODE.horizontal:
                break;

            case DOMNavigator.MODE.vertical:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected.previousElementSibling;
                break;

            case DOMNavigator.MODE.grid:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected;
                for (let i = 0; i < this.options.cols; i++) {
                    next = next && next.previousElementSibling;
                }

                break;
        }

        this.select(next, DOMNavigator.DIRECTION.up);
    }

    /**
     * Navigate right to the next element if any.
     */
    right () {
        let next = null;

        switch (this.options.mode) {
            case DOMNavigator.MODE.auto:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                let left = this.selected.offsetLeft + this.selected.offsetWidth;
                let top = this.selected.offsetTop;

                next = this.elementsAfter(left, 0).reduce((prev, curr) => {
                    let currDistance = Math.abs(curr.offsetLeft - left) + Math.abs(curr.offsetTop - top);
                    if (currDistance < prev.distance) {
                        return {
                            distance: currDistance,
                            element: curr
                        };
                    }
                    return prev;
                }, {
                    distance: Infinity
                });
                next = next.element;
                break;

            case DOMNavigator.MODE.horizontal:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected.nextElementSibling;
                break;

            case DOMNavigator.MODE.vertical:
                break;

            case DOMNavigator.MODE.grid:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                let index = this.elements().indexOf(this.selected);
                if (index === 0 || (index + 1) % this.options.cols !== 0) {
                    next = this.selected.nextElementSibling;
                }

                break;
        }

        this.select(next, DOMNavigator.DIRECTION.right);
    }

    /**
     * Navigate down to the next element if any.
     */
    down () {
        let next = null;

        switch (this.options.mode) {

            case DOMNavigator.MODE.auto:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                let left = this.selected.offsetLeft;
                let top = this.selected.offsetTop + this.selected.offsetHeight;

                next = this.elementsAfter(0, top).reduce((prev, curr) => {
                    let currDistance = Math.abs(curr.offsetLeft - left) + Math.abs(curr.offsetTop - top);
                    if (currDistance < prev.distance) {
                        return {
                            distance: currDistance,
                            element: curr
                        };
                    }
                    return prev;
                }, {
                    distance: Infinity
                });
                next = next.element;
                break;

            case DOMNavigator.MODE.horizontal:
                break;

            case DOMNavigator.MODE.vertical:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected.nextElementSibling;
                break;

            case DOMNavigator.MODE.grid:
                if (!this.selected) {
                    next = this.elements()[0];
                    break;
                }

                next = this.selected;
                for (let i = 0; i < this.options.cols; i++) {
                    next = next && next.nextElementSibling;
                }

                break;
        }
        this.select(next, DOMNavigator.DIRECTION.down);
    }

    /**
     * Return the selected DOM element.
     * @return {Element} The selected DOM element.
     */
    selected () {
        return this.selected;
    }

    /**
     * Select the given element.
     * @param {Element} el The DOM element to select.
     * @param {string} direction The direction.
     * @return void
     */
    select(el, direction) {
        // Is there an element or is it selected?
        if (!el || el === this.selected) {
            return; // Nothing to do here.
        }
        el = unboxElement(el);
        // Unselect previous element.
        if (this.selected) {
            u.removeClass(this.options.selected, this.selected);
        }
        // Scroll to given element.
        this.scrollTo(el, direction);
        // Select given element.
        u.addClass(this.options.selected, el);
        this.selected = el;
    }

    /**
     * Scroll the container to an element.
     * @param el {Element} The destination element.
     * @param direction {String} The direction of the current navigation.
     * @return void.
     */
    scrollTo(el, direction) {
        el = unboxElement(el);
        if (!this.inContainerViewport(el)) {
            switch (direction) {
                case DOMNavigator.DIRECTION.left:
                    this.container.scrollLeft = el.offsetLeft - this.container.offsetLeft;
                    break;
                case DOMNavigator.DIRECTION.up:
                    this.container.scrollTop = el.offsetTop - this.container.offsetTop;
                    break;
                case DOMNavigator.DIRECTION.right:
                    this.container.scrollLeft = el.offsetLeft - this.container.offsetLeft - (this.container.offsetWidth - el.offsetWidth);
                    break;
                case DOMNavigator.DIRECTION.down:
                    this.container.scrollTop = el.offsetTop - this.container.offsetTop - (this.container.offsetHeight - el.offsetHeight);
                    break;
            }
        } else if (!inViewport(el)) {
            switch (direction) {
                case DOMNavigator.DIRECTION.left:
                    document.body.scrollLeft = absoluteOffsetLeft(el) - document.body.offsetLeft;
                    break;
                case DOMNavigator.DIRECTION.up:
                    document.body.scrollTop = absoluteOffsetTop(el) - document.body.offsetTop;
                    break;
                case DOMNavigator.DIRECTION.right:
                    document.body.scrollLeft = absoluteOffsetLeft(el) - document.body.offsetLeft - (document.documentElement.clientWidth - el.offsetWidth);
                    break;
                case DOMNavigator.DIRECTION.down:
                    document.body.scrollTop = absoluteOffsetTop(el) - document.body.offsetTop - (document.documentElement.clientHeight - el.offsetHeight);
                    break;
            }
        }
    }

    /**
     * Indicate if an element is in the container viewport.
     * @param el {Element} The element to check.
     * @return {Boolean} true if the given element is in the container viewport, otherwise false.
     */
    inContainerViewport(el) {
        el = unboxElement(el);
        // Check on left side.
        if (el.offsetLeft - this.container.scrollLeft < this.container.offsetLeft) {
            return false;
        }
        // Check on top side.
        if (el.offsetTop - this.container.scrollTop < this.container.offsetTop) {
            return false;
        }
        // Check on right side.
        if ((el.offsetLeft + el.offsetWidth - this.container.scrollLeft) > (this.container.offsetLeft + this.container.offsetWidth)) {
            return false;
        }
        // Check on down side.
        if ((el.offsetTop + el.offsetHeight - this.container.scrollTop) > (this.container.offsetTop + this.container.offsetHeight)) {
            return false;
        }
        return true;
    }

    /**
     * Return an array of the navigable elements.
     * @return {Array} An array of elements.
     */
    elements () {
        const children = [];
        for (let i = this.container.children.length; i--;) {
            // Skip comment nodes on IE8
            if (this.container.children[i].nodeType !== 8) {
                children.unshift(this.container.children[i]);
            }
        }
        return children;
    }

    /**
     * Return an array of navigable elements after an offset.
     * @param {number} left The left offset.
     * @param {number} top The top offset.
     * @return {Array} An array of elements.
     */
    elementsAfter(left, top) {
        return this.elements().filter(el => el.offsetLeft >= left && el.offsetTop >= top);
    }

    /**
     * Return an array of navigable elements before an offset.
     * @param {number} left The left offset.
     * @param {number} top The top offset.
     * @return {Array} An array of elements.
     */
    elementsBefore(left, top) {
        return this.elements().filter(el => el.offsetLeft <= left && el.offsetTop <= top);
    }

    /**
     * Handle the key down event.
     * @param {Event} event The event object.
     */
    handleKeydown (event) {
        if (this.keys[event.which]) {
            event.preventDefault();
            this.keys[event.which].call(this);
        }
    }
}

export default DOMNavigator;
