/*! react-split - v2.0.14 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('react'), require('prop-types'), require('split.js')) :
    typeof define === 'function' && define.amd ? define(['react', 'prop-types', 'split.js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ReactSplit = factory(global.React, global.PropTypes, global.Split));
}(this, (function (React, PropTypes, Split) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
    var PropTypes__default = /*#__PURE__*/_interopDefaultLegacy(PropTypes);
    var Split__default = /*#__PURE__*/_interopDefaultLegacy(Split);

    function objectWithoutProperties (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

    var SplitWrapper = /*@__PURE__*/(function (superclass) {
        function SplitWrapper () {
            superclass.apply(this, arguments);
        }

        if ( superclass ) SplitWrapper.__proto__ = superclass;
        SplitWrapper.prototype = Object.create( superclass && superclass.prototype );
        SplitWrapper.prototype.constructor = SplitWrapper;

        SplitWrapper.prototype.componentDidMount = function componentDidMount () {
            var ref = this.props;
            ref.children;
            var gutter = ref.gutter;
            var rest = objectWithoutProperties( ref, ["children", "gutter"] );
            var options = rest;

            options.gutter = function (index, direction) {
                var gutterElement;

                if (gutter) {
                    gutterElement = gutter(index, direction);
                } else {
                    gutterElement = document.createElement('div');
                    gutterElement.className = "gutter gutter-" + direction;
                }

                // eslint-disable-next-line no-underscore-dangle
                gutterElement.__isSplitGutter = true;
                return gutterElement
            };

            this.split = Split__default['default'](this.parent.children, options);
        };

        SplitWrapper.prototype.componentDidUpdate = function componentDidUpdate (prevProps) {
            var this$1 = this;

            var ref = this.props;
            ref.children;
            var minSize = ref.minSize;
            var sizes = ref.sizes;
            var collapsed = ref.collapsed;
            var rest = objectWithoutProperties( ref, ["children", "minSize", "sizes", "collapsed"] );
            var options = rest;
            var prevMinSize = prevProps.minSize;
            var prevSizes = prevProps.sizes;
            var prevCollapsed = prevProps.collapsed;

            var otherProps = [
                'maxSize',
                'expandToMin',
                'gutterSize',
                'gutterAlign',
                'snapOffset',
                'dragInterval',
                'direction',
                'cursor' ];

            var needsRecreate = otherProps
                // eslint-disable-next-line react/destructuring-assignment
                .map(function (prop) { return this$1.props[prop] !== prevProps[prop]; })
                .reduce(function (accum, same) { return accum || same; }, false);

            // Compare minSize when both are arrays, when one is an array and when neither is an array
            if (Array.isArray(minSize) && Array.isArray(prevMinSize)) {
                var minSizeChanged = false;

                minSize.forEach(function (minSizeI, i) {
                    minSizeChanged = minSizeChanged || minSizeI !== prevMinSize[i];
                });

                needsRecreate = needsRecreate || minSizeChanged;
            } else if (Array.isArray(minSize) || Array.isArray(prevMinSize)) {
                needsRecreate = true;
            } else {
                needsRecreate = needsRecreate || minSize !== prevMinSize;
            }

            // Destroy and re-create split if options changed
            if (needsRecreate) {
                options.minSize = minSize;
                options.sizes = sizes || this.split.getSizes();
                this.split.destroy(true, true);
                options.gutter = function (index, direction, pairB) { return pairB.previousSibling; };
                this.split = Split__default['default'](
                    Array.from(this.parent.children).filter(
                        // eslint-disable-next-line no-underscore-dangle
                        function (element) { return !element.__isSplitGutter; }
                    ),
                    options
                );
            } else if (sizes) {
                // If only the size has changed, set the size. No need to do this if re-created.
                var sizeChanged = false;

                sizes.forEach(function (sizeI, i) {
                    sizeChanged = sizeChanged || sizeI !== prevSizes[i];
                });

                if (sizeChanged) {
                    // eslint-disable-next-line react/destructuring-assignment
                    this.split.setSizes(this.props.sizes);
                }
            }

            // Collapse after re-created or when collapsed changed.
            if (
                Number.isInteger(collapsed) &&
                (collapsed !== prevCollapsed || needsRecreate)
            ) {
                this.split.collapse(collapsed);
            }
        };

        SplitWrapper.prototype.componentWillUnmount = function componentWillUnmount () {
            this.split.destroy();
            delete this.split;
        };

        SplitWrapper.prototype.render = function render () {
            var this$1 = this;

            var ref = this.props;
            ref.sizes;
            ref.minSize;
            ref.maxSize;
            ref.expandToMin;
            ref.gutterSize;
            ref.gutterAlign;
            ref.snapOffset;
            ref.dragInterval;
            ref.direction;
            ref.cursor;
            ref.gutter;
            ref.elementStyle;
            ref.gutterStyle;
            ref.onDrag;
            ref.onDragStart;
            ref.onDragEnd;
            ref.collapsed;
            var children = ref.children;
            var rest$1 = objectWithoutProperties( ref, ["sizes", "minSize", "maxSize", "expandToMin", "gutterSize", "gutterAlign", "snapOffset", "dragInterval", "direction", "cursor", "gutter", "elementStyle", "gutterStyle", "onDrag", "onDragStart", "onDragEnd", "collapsed", "children"] );
            var rest = rest$1;

            return (
                React__default['default'].createElement( 'div', Object.assign({},
                    { ref: function (parent) {
                        this$1.parent = parent;
                    } }, rest),
                    children
                )
            )
        };

        return SplitWrapper;
    }(React__default['default'].Component));

    SplitWrapper.propTypes = {
        sizes: PropTypes__default['default'].arrayOf(PropTypes__default['default'].number),
        minSize: PropTypes__default['default'].oneOfType([
            PropTypes__default['default'].number,
            PropTypes__default['default'].arrayOf(PropTypes__default['default'].number) ]),
        maxSize: PropTypes__default['default'].oneOfType([
            PropTypes__default['default'].number,
            PropTypes__default['default'].arrayOf(PropTypes__default['default'].number) ]),
        expandToMin: PropTypes__default['default'].bool,
        gutterSize: PropTypes__default['default'].number,
        gutterAlign: PropTypes__default['default'].string,
        snapOffset: PropTypes__default['default'].oneOfType([
            PropTypes__default['default'].number,
            PropTypes__default['default'].arrayOf(PropTypes__default['default'].number) ]),
        dragInterval: PropTypes__default['default'].number,
        direction: PropTypes__default['default'].string,
        cursor: PropTypes__default['default'].string,
        gutter: PropTypes__default['default'].func,
        elementStyle: PropTypes__default['default'].func,
        gutterStyle: PropTypes__default['default'].func,
        onDrag: PropTypes__default['default'].func,
        onDragStart: PropTypes__default['default'].func,
        onDragEnd: PropTypes__default['default'].func,
        collapsed: PropTypes__default['default'].number,
        children: PropTypes__default['default'].arrayOf(PropTypes__default['default'].element),
    };

    SplitWrapper.defaultProps = {
        sizes: undefined,
        minSize: undefined,
        maxSize: undefined,
        expandToMin: undefined,
        gutterSize: undefined,
        gutterAlign: undefined,
        snapOffset: undefined,
        dragInterval: undefined,
        direction: undefined,
        cursor: undefined,
        gutter: undefined,
        elementStyle: undefined,
        gutterStyle: undefined,
        onDrag: undefined,
        onDragStart: undefined,
        onDragEnd: undefined,
        collapsed: undefined,
        children: undefined,
    };

    return SplitWrapper;

})));
