/**
 * json property class for display
 */
var JsonProperty = (function () {
    function JsonProperty() {
        /**
         * display element
         */
        this.property = $('#property');
        /**
         * setting events
         */
        this.events = {};
    }
    /**
     * clear all events
     */
    JsonProperty.prototype.clearEvents = function () {
        var _this = this;
        Object.keys(this.events).forEach(function (key) {
            $(document).off(_this.events[key], key);
            delete _this.events[key];
        });
    };
    /**
     * set text changed event for number property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    JsonProperty.prototype.setChangeEventForNumber = function (object, id, prop) {
        var _this = this;
        id = "#" + id;
        this.events[id] = 'change';
        $(document).on(this.events[id], id, function (eventObject) {
            var element = $(eventObject.target);
            var v = element.val().trim();
            if (v.match(/^\-?\d+$/)) {
                if (prop.validation === undefined || (prop.validation && prop.validation(_this.tree, v))) {
                    object[prop.key] = parseInt(v);
                    element.borderValid();
                    return;
                }
            }
            element.borderInvalid();
        });
    };
    /**
     * set keyup event for string property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    JsonProperty.prototype.setKeyupEventForString = function (object, id, prop) {
        var _this = this;
        id = "#" + id;
        this.events[id] = 'keyup';
        $(document).on(this.events[id], id, function (eventObject) {
            var element = $(eventObject.target);
            var newData = element.val();
            var oldData = object[prop.key];
            if (oldData === newData) {
                element.borderValid();
                return;
            }
            if (prop.validation === undefined || (prop.validation && prop.validation(_this.tree, newData, oldData))) {
                if (prop.callback) {
                    prop.callback(_this.tree, object, newData);
                }
                object[prop.key] = newData;
                if (prop.isUpdateUI) {
                    $(document).trigger('updateDisplay');
                }
                element.borderValid();
            }
            else {
                element.borderInvalid();
            }
        });
        this.events["#" + id] = 'keyup';
    };
    /**
     * set select box change event for boolean property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    JsonProperty.prototype.setChangeEventForBoolean = function (object, id, prop) {
        var _this = this;
        id = "#" + id;
        this.events[id] = 'change';
        $(document).on(this.events[id], id, function (eventObject) {
            var element = $(eventObject.target);
            var newData = element.val();
            var oldData = object[prop.key];
            if (oldData === newData) {
                return;
            }
            if (prop.callback) {
                prop.callback(_this.tree, object, newData);
            }
            object[prop.key] = newData === 'true';
        });
    };
    /**
     * set select box change event for host property
     * @param host registered host information
     * @param id id for html
     */
    JsonProperty.prototype.setChangeEventForHost = function (host, id) {
        var _this = this;
        id = "#" + id;
        this.events[id] = 'change';
        $(document).on(this.events[id], id, function (eventObject) {
            var newData = $(eventObject.target).val();
            var oldData = host.name;
            if (oldData === newData) {
                return;
            }
            var newHost = _this.hostInfos.filter(function (host) { return host.name === newData; })[0];
            host.name = newHost.name;
            host.description = newHost.description;
            host.path = newHost.path;
            host.host = newHost.host;
            host.username = newHost.username;
            host.privateKey = newHost.privateKey;
        });
    };
    /**
     * set select box change event for scheduler property
     * @param host registered host information
     * @param id id for html
     */
    JsonProperty.prototype.setChangeEventForScheduler = function (host, id) {
        id = "#" + id;
        this.events[id] = 'change';
        $(document).on(this.events[id], id, function (eventObject) {
            var newData = $(eventObject.target).val();
            var oldData = host.job_scheduler;
            if (oldData === newData) {
                return;
            }
            host.job_scheduler = newData;
        });
    };
    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    JsonProperty.prototype.createButtonEvent = function (object, props) {
        var _this = this;
        var html = [];
        var title;
        props.forEach(function (prop) {
            var id = "button_property_" + JsonProperty.counter++;
            if (!prop.validation || prop.validation(_this.tree)) {
                $(document).on('click', "#" + id, function (eventObject) {
                    var element = $(eventObject.target);
                    if (prop.callback) {
                        prop.callback(_this.tree, object);
                    }
                    if (prop.isUpdateUI) {
                        _this.updateDisplay();
                        $(document).trigger('updateDisplay');
                    }
                });
                _this.events["#" + id] = 'click';
            }
            else {
                _this.property.ready(function () {
                    $("#" + id).prop('disabled', true).class('disable_button button');
                });
                _this.events['#property'] = 'ready';
            }
            if (title === undefined) {
                title = _this.createItemName(prop.title);
            }
            html.push("<input type=\"button\" value=\"" + prop.key + "\" class=\"button\" id=\"" + id + "\">");
        });
        return "<hr><div>" + title + "<div>" + html.join('') + "</div></div>";
    };
    /**
     * create html content
     * @param object property information of SwfTree instance
     * @param prop property config
     */
    JsonProperty.prototype.createHtmlContent = function (object, prop) {
        var content = '';
        var id = "property_" + JsonProperty.counter++;
        if (prop.readonly && prop.readonly(this.tree, object)) {
            content = "<input type=\"text\" value=\"" + object[prop.key] + "\" class=\"text_box text_readonly property_text\" disabled>";
        }
        else {
            switch (prop.type) {
                case 'string':
                    content = "<input type=\"text\" value=\"" + object[prop.key] + "\" class=\"text_box property_text\" id=\"" + id + "\" spellcheck=\"false\">";
                    this.setKeyupEventForString(object, id, prop);
                    break;
                case 'number':
                    content = "<input type=\"number\" value=\"" + object[prop.key] + "\" class=\"text_box property_text\" id=\"" + id + "\" min=\"0\">";
                    this.setChangeEventForNumber(object, id, prop);
                    break;
                case 'boolean':
                    var selectedTrue = object[prop.key] ? 'selected' : '';
                    var selectedFalse = !object[prop.key] ? 'selected' : '';
                    content = "\n                    <select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">\n                        <option value=\"true\" " + selectedTrue + ">TRUE</option>\n                        <option value=\"false\" " + selectedFalse + ">FALSE</option>\n                    </select>";
                    this.setChangeEventForBoolean(object, id, prop);
                    break;
                case 'host':
                    var hosts = this.hostInfos.map(function (host) {
                        var isSelected = host.name === object.name ? 'selected' : '';
                        return "<option value=\"" + host.name + "\" " + isSelected + ">" + host.name + "</option>";
                    });
                    content = "<select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">" + hosts.join('') + "</select>";
                    this.setChangeEventForHost(object, id);
                    break;
                case 'scheduler':
                    var schedulers = Object.keys(config.scheduler).map(function (key) {
                        var value = config.scheduler[key];
                        var isSelected = value === object.job_scheduler ? 'selected' : '';
                        return "<option value=\"" + value + "\" " + isSelected + ">" + value + "</option>";
                    });
                    content = "<select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">" + schedulers.join('') + "</select>";
                    this.setChangeEventForScheduler(object, id);
                    break;
                default:
                    break;
            }
        }
        return "\n            <tr>\n                <td style=\"width:150px; padding-left: 10px\">" + this.createItemName(prop.key) + "</td>\n                <td style=\"height: 29px\">" + content + "</td>\n            <tr>";
    };
    /**
     * update property infomation
     */
    JsonProperty.prototype.updateDisplay = function () {
        this.property.empty();
        this.property.html(this.createPropertyHtml());
    };
    /**
     * create property item name
     * @param key property key name
     * @return create property item name
     */
    JsonProperty.prototype.createItemName = function (key) {
        return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLocaleLowerCase();
    };
    /**
     * create property html
     * @return html string
     */
    JsonProperty.prototype.createPropertyHtml = function () {
        var _this = this;
        this.clearEvents();
        JsonProperty.counter = 0;
        var html = ['<div>property</div>'];
        var parentHtml = [];
        var property = ClientUtility.getPropertyInfo(this.tree);
        var createTableHtml = function (data) {
            var html = "<table>" + data.join('') + "</table>";
            data.length = 0;
            return html;
        };
        var createSubTitle = function (object, prop) {
            if (prop.button) {
                return _this.createButtonEvent(object, prop.button);
            }
            else if (prop.title) {
                return "<hr><div>" + prop.title + "</div>";
            }
            else {
                return "<hr><div>" + _this.createItemName(prop.key) + "</div>";
            }
        };
        property.forEach(function (prop) {
            var key = prop.key;
            if (prop.isarray) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }
                _this.tree[key].forEach(function (value, index) {
                    prop.item.forEach(function (item) {
                        html.push(_this.createHtmlContent(value, item));
                    });
                    parentHtml.push(createSubTitle(_this.tree[key][index], prop));
                    parentHtml.push(createTableHtml(html));
                });
                html.length = 0;
            }
            else if (prop.ishash) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }
                if (prop.item) {
                    prop.item.forEach(function (item) {
                        html.push(_this.createHtmlContent(_this.tree[key], item));
                    });
                    parentHtml.push(createSubTitle(_this.tree[key], prop));
                    parentHtml.push(createTableHtml(html));
                }
                else {
                    parentHtml.push(createSubTitle(_this.tree[key], prop));
                }
            }
            else {
                if (prop.title) {
                    html.push(createSubTitle(_this.tree[key], prop));
                }
                else if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(_this.createHtmlContent(_this.tree, prop));
            }
        });
        if (html.length) {
            parentHtml.push(createTableHtml(html));
        }
        parentHtml.push('<hr>');
        return parentHtml.join('');
    };
    /**
     * hide property
     */
    JsonProperty.prototype.hide = function () {
        var _this = this;
        this.property.animate({ width: '0px', 'min-width': '0px' }, 100, function () {
            _this.property.displayNone();
            _this.property.html('');
        });
    };
    /**
     * show property
     * @param tree display target SwfTree instance
     * @param hostInfos registerd host informations
     */
    JsonProperty.prototype.show = function (tree, hostInfos) {
        this.tree = tree;
        this.hostInfos = hostInfos;
        this.property.html(this.createPropertyHtml());
        if (this.property.css('display') === 'none') {
            this.property.displayBlock();
            this.property.animate({ width: '350px', 'min-width': '350px' }, 100);
        }
    };
    return JsonProperty;
}());
/**
 * unique counter for html element id
 */
JsonProperty.counter = 0;
//# sourceMappingURL=jsonProperty.js.map