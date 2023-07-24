'use strict';

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
