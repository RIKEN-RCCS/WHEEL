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
 * svg after task plug class
 */
var SvgLower = (function (_super) {
    __extends(SvgLower, _super);
    /**
     * create new instance
     * @param config plug config
     */
    function SvgLower(config) {
        var _this = _super.call(this, config) || this;
        _this.plugConfig.offsetX -= _this.plugWidth / 2;
        _this.plugConfig.offsetY -= 5;
        _this.moveDefault();
        _this.plug.draggable();
        var cable = _this.plugConfig.svg.path('').fill('none').stroke({ color: _this.plugConfig.color, width: 2 });
        _this.cable = new SvgCable(cable, _this.x(), _this.y(), function (startX, startY, endX, endY) {
            var sx = _this.plugConfig.offsetX + startX + _this.plugWidth / 2;
            var sy = _this.plugConfig.offsetY + startY + _this.plugHeight / 2;
            var ex = _this.plugConfig.offsetX + endX + _this.plugWidth / 2;
            var ey = _this.plugConfig.offsetY + endY + _this.plugHeight / 2;
            var my = (sy + ey) / 2;
            var plot = [
                'M',
                sx + " " + sy,
                'C',
                sx + " " + my,
                ex + " " + my,
                ex + " " + ey
            ];
            return plot.join(' ');
        });
        return _this;
    }
    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    SvgLower.prototype.isConnect = function () {
        return this.connectedUpper != null;
    };
    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgLower instance
     */
    SvgLower.prototype.onDragstart = function (callback) {
        this.plug.on('dragstart', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgLower instance
     */
    SvgLower.prototype.onMousedown = function (callback) {
        var _this = this;
        this.plug.on('mousedown', function (e) {
            e.preventDefault();
            var upper = _this.connectedUpper;
            if (_this.isConnect()) {
                console.log("disconnect " + _this.name() + " to " + _this.connectedUpper.name());
                _this.connectedUpper.deleteConnect(_this);
                _this.connectedUpper = null;
            }
            else {
                _this.cable.plotStart(_this.x(), _this.y());
            }
            callback(upper);
        });
        return this;
    };
    /**
     * add a listener for dragmove event
     * @param callback The function to call when we get the dragmove event
     * @return SvgLower instance
     */
    SvgLower.prototype.onDragmove = function (callback) {
        var _this = this;
        this.plug.on('dragmove', function (e) {
            if (_this.isConnect()) {
                _this.plotConnectedCable(_this.connectedUpper);
            }
            else {
                _this.cable.plotEnd(_this.x(), _this.y());
            }
            callback();
        });
        return this;
    };
    /**
     * add a listener for dragend event
     * @param callback The function to call when we get the dragend event
     * @return SvgLower instance
     */
    SvgLower.prototype.onDragend = function (callback) {
        this.plug.on('dragend', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    /**
     * connect to after task plug
     * @param upper target after task plug
     * @param isBind if true, connection is not disconnect
     * @return whether connection is succeed or not
     */
    SvgLower.prototype.connect = function (upper, isBind) {
        var _this = this;
        if (upper != null && upper.connect(this)) {
            // console.log(`connect lower=${this.name()} to upper=${upper.name()}`);
            this.connectedUpper = upper;
            this.calcConnectPotision(this.connectedUpper, function (x, y) {
                _this.move(x, y).front();
            }).plotConnectedCable(this.connectedUpper);
            if (isBind) {
                this.offDraggable();
            }
            return true;
        }
        else {
            this.cable.erase();
            this.moveDefault();
            return false;
        }
    };
    /**
     * move plug if this plug is not connected
     * @param x x point
     * @param y y point
     * @return SvgLower instance
     */
    SvgLower.prototype.moveIfDisconnect = function (x, y) {
        if (!this.isConnect()) {
            this.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    };
    /**
     * calc connected plug position
     * @param upper connected after task plug
     * @param callback The function to call when we get point
     * @return SvgLower instance
     */
    SvgLower.prototype.calcConnectPotision = function (upper, callback) {
        if (this.isConnect() && upper != null) {
            var offset = upper.offset();
            var x = upper.x();
            var y = upper.y();
            callback(-this.plugConfig.offsetX + x + offset.x, -this.plugConfig.offsetY + y + offset.y);
        }
        return this;
    };
    /**
     * plot connected cable
     * @param upper connected after task plug
     * @return SvgLower instance
     */
    SvgLower.prototype.plotConnectedCable = function (upper) {
        var _this = this;
        if (this.isConnect()) {
            this.calcConnectPotision(upper, function (x, y) {
                _this.cable.plotEnd(x, y);
            });
        }
        return this;
    };
    /**
     * remove all event listeners
     */
    SvgLower.prototype.offDraggable = function () {
        this.plug.off('mousedown', null);
        this.plug.off('dragstart', null);
        this.plug.off('dragmove', null);
        this.plug.off('dragend', null);
        this.plug.draggable(false);
    };
    /**
     * delete this plug
     * @return SvgConnector instance
     */
    SvgLower.prototype.delete = function () {
        this.plugConfig.svg = null;
        this.plugConfig.tree = null;
        this.plugConfig.file = null;
        if (this.plug != null) {
            this.offDraggable();
            this.plug.remove();
            this.plug = null;
        }
        this.cable.remove();
        return this;
    };
    return SvgLower;
}(SvgPlugBase));
//# sourceMappingURL=svgLower.js.map