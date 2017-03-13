var JsonProperty = (function () {
    function JsonProperty() {
        /**
         *
         */
        this.property = $('#property');
        /**
         *
         */
        this.events = {};
    }
    /**
     *
     */
    JsonProperty.prototype.clearEvents = function () {
        var _this = this;
        Object.keys(this.events).forEach(function (key) {
            $(document).off(_this.events[key], key);
            delete _this.events[key];
        });
    };
    /**
     *
     * @param object
     * @param key
     * @param id
     */
    JsonProperty.prototype.createNumberChangedEvent = function (object, key, id, prop) {
        var _this = this;
        $(document).on('change', "#" + id, function (eventObject) {
            var element = $(eventObject.target);
            var v = element.val().trim();
            if (v.match(/^\-?\d+$/)) {
                if (prop.validation === undefined || (prop.validation && prop.validation(_this.child, v))) {
                    object[key] = parseInt(v);
                    element.borderValid();
                    return;
                }
            }
            element.borderInvalid();
        });
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param object
     * @param key
     * @param id
     * @param prop
     */
    JsonProperty.prototype.createTextChangedEvent = function (object, key, id, prop) {
        var _this = this;
        $(document).on('keyup', "#" + id, function (eventObject) {
            var element = $(eventObject.target);
            var newData = element.val();
            var oldData = object[key];
            if (oldData === newData) {
                element.borderValid();
                return;
            }
            if (prop.validation === undefined || (prop.validation && prop.validation(_this.child, newData, oldData))) {
                if (prop.callback) {
                    prop.callback(_this.child, object, newData);
                }
                object[key] = newData;
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
     *
     * @param object
     * @param key
     * @param id
     */
    JsonProperty.prototype.createBooleanChangedEvent = function (object, key, id, prop) {
        var _this = this;
        $(document).on('change', "#" + id, function (eventObject) {
            var element = $(eventObject.target);
            var newData = element.val();
            var oldData = object[key];
            if (oldData === newData) {
                return;
            }
            if (prop.callback) {
                prop.callback(_this.child, object, newData);
            }
            object[key] = newData === 'true';
        });
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param object
     * @param key
     * @param id
     */
    JsonProperty.prototype.createTypeChangedEvent = function (object, key, id, prop) {
        $(document).on('change', "#" + id, function (eventObject) {
            var newData = $(eventObject.target).val();
            var oldData = object[key];
            if (oldData === newData) {
                return;
            }
            object[key] = newData;
            $(document).trigger('updateDisplay');
        });
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param host
     * @param key
     * @param id
     * @param prop
     */
    JsonProperty.prototype.createHostChangedEvent = function (host, id) {
        var _this = this;
        $(document).on('change', "#" + id, function (eventObject) {
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
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param host
     * @param key
     * @param id
     * @param prop
     */
    JsonProperty.prototype.createSchedulerChangedEvent = function (host, id) {
        $(document).on('change', "#" + id, function (eventObject) {
            var newData = $(eventObject.target).val();
            var oldData = host.job_scheduler;
            if (oldData === newData) {
                return;
            }
            host.job_scheduler = newData;
        });
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param object
     * @param prop
     */
    JsonProperty.prototype.getContents = function (object, prop) {
        var content = '';
        var id = "property_" + JsonProperty.counter++;
        var key = prop.key;
        if (prop.readonly) {
            content = "<input type=\"text\" value=\"" + object[key] + "\" class=\"text_box text_readonly property_text\" disabled>";
        }
        else {
            switch (prop.type) {
                case 'string':
                    content = "<input type=\"text\" value=\"" + object[key] + "\" class=\"text_box property_text\" id=\"" + id + "\">";
                    this.createTextChangedEvent(object, key, id, prop);
                    break;
                case 'number':
                    content = "<input type=\"number\" value=\"" + object[key] + "\" class=\"text_box property_text\" id=\"" + id + "\" min=\"0\">";
                    this.createNumberChangedEvent(object, key, id, prop);
                    break;
                case 'boolean':
                    var selectedTrue = object[key] ? 'selected' : '';
                    var selectedFalse = !object[key] ? 'selected' : '';
                    content = "\n                    <select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">\n                        <option value=\"true\" " + selectedTrue + ">TRUE</option>\n                        <option value=\"false\" " + selectedFalse + ">FALSE</option>\n                    </select>";
                    this.createBooleanChangedEvent(object, key, id, prop);
                    break;
                case 'host':
                    var hosts = this.hostInfos.map(function (host) {
                        var isSelected = host.name === object.name ? 'selected' : '';
                        return "<option value=\"" + host.name + "\" " + isSelected + ">" + host.name + "</option>";
                    });
                    content = "\n                    <select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">\n                        " + hosts.join('') + "\n                    </select>";
                    this.createHostChangedEvent(object, id);
                    break;
                case 'scheduler':
                    var schedulers = Object.keys(config.scheduler).map(function (key) {
                        var value = config.scheduler[key];
                        var isSelected = value === object.job_scheduler ? 'selected' : '';
                        return "<option value=\"" + value + "\" " + isSelected + ">" + value + "</option>";
                    });
                    content = "\n                    <select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">\n                        " + schedulers.join('') + "\n                    </select>";
                    this.createSchedulerChangedEvent(object, id);
                    break;
                default:
                    break;
            }
        }
        return "\n            <tr>\n                <td style=\"width:150px; padding-left: 10px\">" + this.createItemName(key) + "</td>\n                <td style=\"height: 29px\">" + content + "</td>\n            <tr>";
    };
    /**
     * update property infomation
     */
    JsonProperty.prototype.updateDisplay = function () {
        this.property.empty();
        this.property.html(this.createPropertyHtml(this.child));
    };
    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    JsonProperty.prototype.setupButtonEvent = function (object, key, prop) {
        var _this = this;
        var id = "button_property_" + JsonProperty.counter++;
        $(document).on('click', "#" + id, function () {
            if (prop.callback) {
                prop.callback(_this.child, object);
            }
            if (prop.isUpdateUI) {
                _this.updateDisplay();
                $(document).trigger('updateDisplay');
            }
        });
        this.events["#" + id] = 'click';
        return this.createButtonHtml(prop, id);
    };
    /**
     *
     * @param prop
     * @param buttonName
     */
    JsonProperty.prototype.createButtonHtml = function (prop, id) {
        return "\n            <hr>\n            <div>" + this.createItemName(prop.title) + "\n                <div><input type=\"button\" value=\"" + prop.key + "\" class=\"button\" id=" + id + "></div>\n            </div>";
    };
    /**
     * create property item name
     * @param key
     */
    JsonProperty.prototype.createItemName = function (key) {
        return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLocaleLowerCase();
    };
    /**
     * create property html
     * @param tree
     */
    JsonProperty.prototype.createPropertyHtml = function (tree) {
        var _this = this;
        this.clearEvents();
        JsonProperty.counter = 0;
        this.child = tree;
        var html = ['<div>property</div>'];
        var parentHtml = [];
        var property = ClientUtility.getPropertyInfo(tree);
        var createTableHtml = function (data) {
            var html = "<table>" + data.join('') + "</table>";
            data.length = 0;
            return html;
        };
        var createSubTitle = function (object, prop) {
            if (prop.button) {
                return _this.setupButtonEvent(object, prop.key, prop.button);
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
                tree[key].forEach(function (value, index) {
                    prop.item.forEach(function (item) {
                        html.push(_this.getContents(value, item));
                    });
                    parentHtml.push(createSubTitle(tree[key][index], prop));
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
                        html.push(_this.getContents(tree[key], item));
                    });
                    parentHtml.push(createSubTitle(tree[key], prop));
                    parentHtml.push(createTableHtml(html));
                }
                else {
                    parentHtml.push(createSubTitle(tree[key], prop));
                }
            }
            else {
                if (prop.title) {
                    html.push(createSubTitle(tree[key], prop));
                }
                else if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(_this.getContents(tree, prop));
            }
        });
        if (html.length) {
            parentHtml.push(createTableHtml(html));
        }
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
     *
     * show property
     * @param tree
     * @param hostInfos
     */
    JsonProperty.prototype.show = function (tree, hostInfos) {
        this.hostInfos = hostInfos;
        this.property.html(this.createPropertyHtml(tree));
        if (this.property.css('display') === 'none') {
            this.property.displayBlock();
            this.property.animate({ width: '350px', 'min-width': '350px' }, 100);
        }
    };
    return JsonProperty;
}());
/**
 *
 */
JsonProperty.counter = 0;
//# sourceMappingURL=jsonProperty.js.map