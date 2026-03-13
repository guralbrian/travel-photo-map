(function () {
    'use strict';

    /**
     * DOM builder helpers — safe element creation without innerHTML.
     * el(tag, attrs, ...children) → HTMLElement
     * text(str) → Text node
     */

    function el(tag, attrs) {
        var element = document.createElement(tag);

        if (attrs) {
            var keys = Object.keys(attrs);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var val = attrs[key];

                if (key === 'className') {
                    element.className = val;
                } else if (key === 'style' && typeof val === 'object') {
                    var styleKeys = Object.keys(val);
                    for (var s = 0; s < styleKeys.length; s++) {
                        element.style[styleKeys[s]] = val[styleKeys[s]];
                    }
                } else if (key === 'dataset' && typeof val === 'object') {
                    var dataKeys = Object.keys(val);
                    for (var d = 0; d < dataKeys.length; d++) {
                        element.dataset[dataKeys[d]] = val[dataKeys[d]];
                    }
                } else if (key.indexOf('on') === 0) {
                    element[key] = val;
                } else {
                    element.setAttribute(key, val);
                }
            }
        }

        for (var c = 2; c < arguments.length; c++) {
            var child = arguments[c];
            if (child == null || child === false) continue;
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        }

        return element;
    }

    function text(str) {
        return document.createTextNode(str);
    }

    function formatDateShort(isoDate) {
        if (!isoDate) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var parts = isoDate.split('-');
        if (parts.length < 3) return isoDate;
        return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
    }

    window.domHelpers = {
        el: el,
        text: text,
        formatDateShort: formatDateShort
    };
})();
