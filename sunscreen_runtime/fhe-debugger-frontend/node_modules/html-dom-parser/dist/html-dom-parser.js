(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["HTMLDOMParser"] = factory();
	else
		root["HTMLDOMParser"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Format DOM attributes to an associative array.
 *
 * @param  {NamedNodeMap} - The list of attributes.
 * @return {Object}       - The object of attributes.
 */
function formatAttributes(attributes) {
    var result = {};
    var attribute;

    // NamedNodeMap is array-like
    for (var i = 0, len = attributes.length; i < len; i++) {
        attribute = attributes[i];
        result[attribute.name] = attribute.value;
    }

    return result;
}

/**
 * Format the browser DOM nodes to mimic the output of `htmlparser2.parseDOM()`.
 *
 * @param  {NodeList} nodes        - The DOM nodes.
 * @param  {Object}   [parentObj]  - The formatted parent node.
 * @param  {String}   [directive]  - The directive.
 * @return {Object}                - The formatted DOM object.
 */
function formatDOM(nodes, parentObj, directive) {
    parentObj = parentObj || null;

    var result = [];
    var node;
    var prevNode;
    var nodeObj;

    // NodeList is array-like
    for (var i = 0, len = nodes.length; i < len; i++) {
        node = nodes[i];
        // reset
        nodeObj = {
            next: null,
            prev: result[i - 1] || null,
            parent: parentObj
        };

        // set the next node for the previous node (if applicable)
        prevNode = result[i - 1];
        if (prevNode) {
            prevNode.next = nodeObj;
        }

        // set the node name if it's not "#text" or "#comment"
        // e.g., "div"
        if (node.nodeName.indexOf('#') !== 0) {
            nodeObj.name = node.nodeName.toLowerCase();

            // also, nodes of type "tag" have "attribs"
            nodeObj.attribs = {}; // default
            if (node.attributes && node.attributes.length) {
                nodeObj.attribs = formatAttributes(node.attributes);
            }
        }

        // set the node type
        // e.g., "tag"
        switch (node.nodeType) {
            // 1 = element
            case 1:
                if (nodeObj.name === 'script' || nodeObj.name === 'style') {
                    nodeObj.type = nodeObj.name;
                } else {
                    nodeObj.type = 'tag';
                }
                // recursively format the children
                nodeObj.children = formatDOM(node.childNodes, nodeObj);
                break;
                // 2 = attribute
                // 3 = text
            case 3:
                nodeObj.type = 'text';
                nodeObj.data = node.nodeValue;
                break;
                // 8 = comment
            case 8:
                nodeObj.type = 'comment';
                nodeObj.data = node.nodeValue;
                break;
            default:
                break;
        }

        result.push(nodeObj);
    }

    if (directive) {
        result.unshift({
            name: directive.substring(0, directive.indexOf(' ')).toLowerCase(),
            data: directive,
            type: 'directive',
            next: result[0] ? result[0] : null,
            prev: null,
            parent: parentObj
        });

        if (result[1]) {
            result[1].prev = result[0];
        }
    }

    return result;
}

/**
 * Detect IE with or without version.
 *
 * @param  {Number} [version] - The IE version to detect.
 * @return {Boolean}          - Whether IE or the version has been detected.
 */
function isIE(version) {
    if (version) {
        return document.documentMode === version;
    }
    return /(MSIE |Trident\/|Edge\/)/.test(navigator.userAgent);
}

/**
 * Export utilities.
 */
module.exports = {
    formatAttributes: formatAttributes,
    formatDOM: formatDOM,
    isIE: isIE
};


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Module dependencies.
 */
var utilities = __webpack_require__(0);
var detectIE = utilities.isIE;

/**
 * Constants.
 */
var HTML_TAG_NAME = 'html';
var BODY_TAG_NAME = 'body';
var HEAD_TAG_NAME = 'head';
var FIRST_TAG_REGEX = /<([a-zA-Z]+[0-9]?)/; // e.g., <h1>
var HEAD_REGEX = /<\/head>/i;
var BODY_REGEX = /<\/body>/i;
// http://www.w3.org/TR/html/syntax.html#void-elements
var VOID_ELEMENTS_REGEX = /<(area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)(.*?)\/?>/gi;

// browser support
var isIE = detectIE();
var isIE9 = detectIE(9);

/**
 * DOMParser (performance: slow).
 *
 * https://developer.mozilla.org/docs/Web/API/DOMParser#Parsing_an_SVG_or_HTML_document
 */
var parseFromString;
if (typeof window.DOMParser === 'function') {
    var domParser = new window.DOMParser();
    // IE9 does not support 'text/html' MIME type
    // https://msdn.microsoft.com/en-us/library/ff975278(v=vs.85).aspx
    var MIME_TYPE = isIE9 ? 'text/xml' : 'text/html';

    /**
     * Creates an HTML document using `DOMParser.parseFromString`.
     *
     * @param  {String} html      - The HTML string.
     * @param  {String} [tagName] - The element to render the HTML (with 'body' as fallback).
     * @return {HTMLDocument}
     */
    parseFromString = function domStringParser(html, tagName) {
        if (tagName) {
            html = ['<', tagName, '>', html, '</', tagName, '>'].join('');
        }
        // because IE9 only supports MIME type 'text/xml', void elements need to be self-closed
        if (isIE9) {
            html = html.replace(VOID_ELEMENTS_REGEX, '<$1$2$3/>');
        }
        return domParser.parseFromString(html, MIME_TYPE);
    };
}

/**
 * DOMImplementation (performance: fair).
 *
 * https://developer.mozilla.org/docs/Web/API/DOMImplementation/createHTMLDocument
 */
var parseFromDocument;
if (typeof document.implementation === 'object') {
    // title parameter is required in IE
    // https://msdn.microsoft.com/en-us/library/ff975457(v=vs.85).aspx
    var doc = document.implementation.createHTMLDocument(isIE ? 'HTML_DOM_PARSER_TITLE' : undefined);

    /**
     * Use HTML document created by `document.implementation.createHTMLDocument`.
     *
     * @param  {String} html      - The HTML string.
     * @param  {String} [tagName] - The element to render the HTML (with 'body' as fallback).
     * @return {HTMLDocument}
     */
    parseFromDocument = function createHTMLDocument(html, tagName) {
        if (tagName) {
            doc.documentElement.getElementsByTagName(tagName)[0].innerHTML = html;
            return doc;
        }

        try {
            doc.documentElement.innerHTML = html;
            return doc;
        // fallback when certain elements in `documentElement` are read-only (IE9)
        } catch (err) {
            if (parseFromString) return parseFromString(html);
        }
    };
}

/**
 * Template (performance: fast).
 *
 * https://developer.mozilla.org/docs/Web/HTML/Element/template
 */
var parseFromTemplate;
var template = document.createElement('template');
if (template.content) {

    /**
     * Uses a template element (content fragment) to parse HTML.
     *
     * @param  {String} html - The HTML string.
     * @return {NodeList}
     */
    parseFromTemplate = function templateParser(html) {
        template.innerHTML = html;
        return template.content.childNodes;
    };
}

/** Fallback document parser. */
var parseWithFallback = parseFromDocument || parseFromString;

/**
 * Parses HTML string to DOM nodes.
 *
 * @param  {String} html      - The HTML string.
 * @param  {String} [tagName] - The tag name.
 * @return {NodeList|Array}
 */
module.exports = function domparser(html) {
    // try to match first tag
    var tagName;
    var match = html.match(FIRST_TAG_REGEX);
    if (match && match[1]) {
        tagName = match[1].toLowerCase();
    }

    var doc;
    var element;
    var elements;

    switch (tagName) {
        case HTML_TAG_NAME:
            if (parseFromString) {
                doc = parseFromString(html);

                // the created document may come with filler head/body elements,
                // so ake sure to remove them if they don't actually exist
                if (!HEAD_REGEX.test(html)) {
                    element = doc.getElementsByTagName(HEAD_TAG_NAME)[0];
                    if (element) element.parentNode.removeChild(element);
                }
                if (!BODY_REGEX.test(html)) {
                    element = doc.getElementsByTagName(BODY_TAG_NAME)[0];
                    if (element) element.parentNode.removeChild(element);
                }

                return doc.getElementsByTagName(HTML_TAG_NAME);
            }
            break;

        case HEAD_TAG_NAME:
            if (parseWithFallback) {
                elements = parseWithFallback(html).getElementsByTagName(HEAD_TAG_NAME);

                // account for possibility of sibling
                if (BODY_REGEX.test(html)) {
                    return elements[0].parentNode.childNodes;
                }
                return elements;
            }
            break;

        case BODY_TAG_NAME:
            if (parseWithFallback) {
                elements = parseWithFallback(html).getElementsByTagName(BODY_TAG_NAME);

                // account for possibility of sibling (return both body and head)
                if (HEAD_REGEX.test(html)) {
                    return elements[0].parentNode.childNodes;
                }
                return elements;
            }
            break;

        // low-level tag or text
        default:
            if (parseFromTemplate) return parseFromTemplate(html);
            if (parseWithFallback) {
                return parseWithFallback(html, BODY_TAG_NAME).getElementsByTagName(BODY_TAG_NAME)[0].childNodes;
            }
            break;
    }

    return [];
};


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Module dependencies.
 */
var domparser = __webpack_require__(1);
var utilities = __webpack_require__(0);
var formatDOM = utilities.formatDOM;
var isIE9 = utilities.isIE(9);

/**
 * Constants.
 */
var DIRECTIVE_REGEX = /<(![a-zA-Z\s]+)>/; // e.g., <!doctype html>

/**
 * Parses HTML and reformats DOM nodes output.
 *
 * @param  {String} html - The HTML string.
 * @return {Array}       - The formatted DOM nodes.
 */
module.exports = function parseDOM(html) {
    if (typeof html !== 'string') {
        throw new TypeError('First argument must be a string.');
    }
    if (!html) return [];

    // match directive
    var match = html.match(DIRECTIVE_REGEX);
    var directive;
    if (match && match[1]) {
        directive = match[1];

        // remove directive in IE9 because DOMParser uses
        // MIME type 'text/xml' instead of 'text/html'
        if (isIE9) {
            html = html.replace(match[0], '');
        }
    }

    return formatDOM(domparser(html), null, directive);
};


/***/ })
/******/ ]);
});