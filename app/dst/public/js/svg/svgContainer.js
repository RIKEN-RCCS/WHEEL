/**
 * plug container class
 */
var SvgContainer = (function () {
    function SvgContainer() {
        /**
         * container object
         */
        this.container = {};
    }
    /**
     * add plug
     * @param plug plug instance
     */
    SvgContainer.prototype.add = function (plug) {
        var name = plug.name();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    };
    /**
     * remove plug
     * @param object plug name or plug
     */
    SvgContainer.prototype.remove = function (object) {
        var name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        if (this.container[name]) {
            this.container[name].delete();
            this.container[name] = null;
            delete this.container[name];
        }
    };
    /**
     * whther specified plug or plug name is exist or not
     * @param object plug or plug name
     * @return whther specified name plug is exist or not
     */
    SvgContainer.prototype.isExist = function (object) {
        var name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        return this.container[name] != null;
    };
    /**
     * find specified name plug
     * @param name plug name
     * @return found plug
     */
    SvgContainer.prototype.find = function (name) {
        return this.container[name];
    };
    /**
     * move all plug to front
     */
    SvgContainer.prototype.front = function () {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            _this.container[key].front();
        });
    };
    /**
     * Performs the specified action for plug in this array
     * @param callback calls function one time for each element in the array
     */
    SvgContainer.prototype.forEach = function (callback) {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            callback(_this.container[key]);
        });
    };
    /**
     * clear container
     */
    SvgContainer.prototype.clear = function () {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            _this.remove(key);
        });
    };
    /**
     * find plug
     * @param hashcode task hash code
     * @param filepath file path string
     * @param find plug list
     */
    SvgContainer.prototype.findFromHashCode = function (hashcode, filepath) {
        var _this = this;
        return Object.keys(this.container).filter(function (key) {
            var task = _this.container[key].getHashCode();
            if (filepath === undefined) {
                return task === hashcode;
            }
            else {
                var file = _this.container[key].getFilepathFromTree();
                return (task === hashcode && file === filepath);
            }
        }).map(function (key) { return _this.container[key]; });
    };
    /**
     * get matched count
     * @param callback make a match callback function
     * @param matched count
     * @return get matched count
     */
    SvgContainer.prototype.count = function (callback) {
        var _this = this;
        var counter = 0;
        Object.keys(this.container).forEach(function (key) {
            if (callback(_this.container[key])) {
                counter++;
            }
        });
        return counter;
    };
    return SvgContainer;
}());
//# sourceMappingURL=svgContainer.js.map