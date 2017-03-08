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
                    $(document).trigger('updateProperty');
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
            $(document).trigger('updateProperty');
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
    JsonProperty.prototype.createHostChangedEvent = function (object, key, id, prop) {
        var _this = this;
        $(document).on('change', "#" + id, function (eventObject) {
            var newData = $(eventObject.target).val();
            var oldData = object[key];
            if (oldData === newData) {
                return;
            }
            var newHost = _this.hostInfos.filter(function (host) { return host.name === newData; })[0];
            Object.keys(newHost).forEach(function (key) {
                object[key] = newHost[key];
            });
        });
        this.events["#" + id] = 'change';
    };
    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    JsonProperty.prototype.getContents = function (object, key, prop) {
        var content = '';
        var id = "property_" + JsonProperty.counter++;
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
                        return "<option value=\"" + host.name + "\" " + isSelected + ">" + host.username + "@" + host.host + "</option>";
                    });
                    content = "\n                    <select name=\"" + id + "\" class=\"text_box\" style=\"width: calc(100% - 4px)\" id=\"" + id + "\">\n                        " + hosts.join('') + "\n                    </select>";
                    this.createHostChangedEvent(object, key, id, prop);
                    break;
                default:
                    break;
            }
        }
        return "\n            <tr>\n                <td style=\"width:150px; padding-left: 10px\">" + this.createItemName(key) + "</td>\n                <td style=\"height: 29px\">" + content + "</td>\n            <tr>";
    };
    /**
     * set up click event for file delete button
     * @param tree
     * @param key
     * @param index
     */
    JsonProperty.prototype.setupFileDeleteButtonEvent = function (tree, key, index) {
        var _this = this;
        var id = "delete_property_" + JsonProperty.counter++;
        $(document).on('click', "#" + id, function () {
            _this.deleteFile(tree, key, index);
            _this.updateProperty();
            $(document).trigger('updateProperty');
        });
        this.events["#" + id] = 'click';
        return this.createDeleteButtonHtml(key, id);
    };
    /**
     * set up click event for file add button
     * @param tree
     * @param key
     */
    JsonProperty.prototype.setupFileAddButtonEvent = function (tree, key) {
        var _this = this;
        var id = "add_property_" + JsonProperty.counter++;
        $(document).on('click', "#" + id, function () {
            _this.addFile(tree, key);
            _this.updateProperty();
            $(document).trigger('updateProperty');
        });
        this.events["#" + id] = 'click';
        return this.createAddButtonHtml(key, id);
    };
    /**
     * update property infomation
     */
    JsonProperty.prototype.updateProperty = function () {
        this.property.html(this.createPropertyHtml(this.child));
    };
    /**
     * create delete button html
     * @param key
     * @param id
     */
    JsonProperty.prototype.createDeleteButtonHtml = function (key, id) {
        return "\n            <hr>\n            <div>" + this.createItemName(key).replace(/s$/, '') + "\n                <div><input type=\"button\" value=\"Delete\" class=\"button\" style=\"width:50px;\" id=" + id + "></div>\n            </div>";
    };
    /**
     * create add button html
     * @param key
     * @param id
     */
    JsonProperty.prototype.createAddButtonHtml = function (key, id) {
        return "\n            <hr>\n            <div>" + this.createItemName(key) + "\n                <div><input type=\"button\" value=\"Add\" class=\"button\" style=\"width:50px;\" id=" + id + "></div>\n            </div>";
    };
    /**
     * add IO file relation
     * @param tree
     * @param key
     */
    JsonProperty.prototype.addFile = function (tree, key) {
        var file = new SwfFile({
            name: 'name',
            description: '',
            path: "./file" + Date.now(),
            type: 'file',
            required: true
        });
        tree[key].push(file);
        var parent = this.child.getParent();
        if (key === 'input_files') {
            parent.addInputFileToParent(this.child, file.path);
        }
        else if (key === 'output_files') {
            parent.addOutputFileToParent(this.child, file.path);
        }
    };
    /**
     * delete IO file relation
     * @param tree
     * @param key
     * @param index
     */
    JsonProperty.prototype.deleteFile = function (tree, key, index) {
        var filepath = tree[key][index].path;
        var parent = this.child.getParent();
        if (key === 'input_files') {
            parent.deleteInputFileFromParent(this.child, filepath);
        }
        else if (key === 'output_files') {
            parent.deleteOutputFileFromParent(this.child, filepath);
        }
        tree[key].splice(index, 1);
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
        var html = ['<div>propety</div>'];
        var parentHtml = [];
        var prop = ClientUtility.getPropertyInfo(tree);
        var createTableHtml = function (data) {
            var html = "<table>" + data.join('') + "</table>";
            data.length = 0;
            return html;
        };
        Object.keys(prop).forEach(function (key) {
            if (Array.isArray(prop[key])) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }
                parentHtml.push(_this.setupFileAddButtonEvent(tree, key));
                tree[key].forEach(function (value, index) {
                    Object.keys(prop[key][0]).forEach(function (secondKey) {
                        html.push(_this.getContents(value, secondKey, prop[key][0][secondKey]));
                    });
                    parentHtml.push(_this.setupFileDeleteButtonEvent(tree, key, index));
                    parentHtml.push(createTableHtml(html));
                });
                html.length = 0;
            }
            else if (prop[key].ishash) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }
                Object.keys(prop[key]).forEach(function (secondKey) {
                    if (secondKey === 'ishash') {
                        return;
                    }
                    html.push(_this.getContents(tree[key], secondKey, prop[key][secondKey]));
                });
                parentHtml.push("<hr><div>" + _this.createItemName(key) + "</div>");
                parentHtml.push(createTableHtml(html));
            }
            else {
                if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(_this.getContents(tree, key, prop[key]));
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