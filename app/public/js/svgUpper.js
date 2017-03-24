var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * svg before task plug class
 */
var SvgUpper = (function (_super) {
    __extends(SvgUpper, _super);
    /**
     * create new instance
     * @param config plug config
     */
    function SvgUpper(config) {
        var _this = _super.call(this, config) || this;
        /**
         * connected before task plugs
         */
        _this.connectedLowers = {};
        _this.plugConfig.offsetX -= _this.plugWidth / 2;
        _this.plugConfig.offsetY -= 5;
        _this.moveDefault();
        return _this;
    }
    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    SvgUpper.prototype.isConnect = function () {
        return Object.keys(this.connectedLowers).length > 0;
    };
    /**
     * connect to output file plug
     * @param lower target before task plug
     * @return whether connection is succeed or not
     */
    SvgUpper.prototype.connect = function (lower) {
        if (this.isCircularReference(lower, this)) {
            console.info('it is circular reference!');
            return false;
        }
        var taskIndex = lower.getTaskIndex();
        if (!this.connectedLowers[taskIndex]) {
            this.connectedLowers[taskIndex] = lower;
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * add a listener for mouseup event
     * @param callback The function to call when we get the mouseup event
     * @return SvgUpper instance
     */
    SvgUpper.prototype.onMouseup = function (callback) {
        this.plug.on('mouseup', function (e) {
            callback();
        });
        return this;
    };
    /**
     * move plug if this plug is connected
     * @param x x point
     * @param y y point
     * @return SvgUpper instance
     */
    SvgUpper.prototype.moveIfConnectedPlug = function (x, y) {
        var _this = this;
        this.move(x, y);
        Object.keys(this.connectedLowers).forEach(function (key) {
            _this.connectedLowers[key].calcConnectPotision(_this, function (x, y) {
                _this.connectedLowers[key].move(x, y);
            });
            _this.connectedLowers[key].plotConnectedCable(_this);
        });
        return this;
    };
    /**
     * move front if this plug is connected
     * @return SvgUpper instance
     */
    SvgUpper.prototype.frontIfConnectedPlug = function () {
        var _this = this;
        if (this.isConnect()) {
            Object.keys(this.connectedLowers).forEach(function (key) {
                _this.connectedLowers[key].front();
            });
            this.back();
        }
        return this;
    };
    /**
     * delete connection
     * @param lower delete target befor task plug
     * @return SvgUpper instance
     */
    SvgUpper.prototype.deleteConnect = function (lower) {
        delete this.connectedLowers[lower.getTaskIndex()];
        return this;
    };
    /**
     * delete this plug
     * @return SvgUpper instance
     */
    SvgUpper.prototype.delete = function () {
        this.plugConfig.svg = null;
        this.plugConfig.tree = null;
        this.plugConfig.file = null;
        if (this.plug != null) {
            this.plug.off('mouseup', null);
            this.plug.remove();
            this.plug = null;
        }
        return this;
    };
    return SvgUpper;
}(SvgPlugBase));
//# sourceMappingURL=svgUpper.js.map