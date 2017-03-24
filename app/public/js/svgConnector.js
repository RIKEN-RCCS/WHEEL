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
 * svg outout file plug class
 */
var SvgConnector = (function (_super) {
    __extends(SvgConnector, _super);
    /**
     * create new instance
     * @param config plug config
     */
    function SvgConnector(config) {
        var _this = _super.call(this, config) || this;
        _this.plug.draggable();
        _this.moveDefault();
        var cable = _this.plugConfig.svg.path('').fill('none').stroke({ color: _this.plugConfig.color, width: 2 });
        _this.cable = new SvgCable(cable, _this.x(), _this.y(), function (startX, startY, endX, endY) {
            var sx = _this.plugConfig.offsetX + startX + _this.plugWidth / 2;
            var sy = _this.plugConfig.offsetY + startY + _this.plugHeight / 2;
            var ex = _this.plugConfig.offsetX + endX + _this.plugWidth / 2;
            var ey = _this.plugConfig.offsetY + endY + _this.plugHeight / 2;
            var mx = (sx + ex) / 2;
            var plot = [
                'M',
                sx + " " + sy,
                'C',
                mx + " " + sy,
                mx + " " + ey,
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
    SvgConnector.prototype.isConnect = function () {
        return this.connectedReceptor != null;
    };
    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgConnector instance
     */
    SvgConnector.prototype.onDragstart = function (callback) {
        this.plug.on('dragstart', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgConnector instance
     */
    SvgConnector.prototype.onMousedown = function (callback) {
        var _this = this;
        this.plug.on('mousedown', function () {
            var receptor = _this.connectedReceptor;
            if (_this.isConnect()) {
                console.log("disconnect index=" + _this.name() + " to index=" + _this.connectedReceptor.name());
                _this.connectedReceptor.deleteConnect();
                _this.connectedReceptor = null;
            }
            else {
                _this.cable.plotStart(_this.x(), _this.y());
            }
            callback(receptor);
        });
        return this;
    };
    /**
     * add a listener for dragmove event
     * @param callback The function to call when we get the dragmove event
     * @return SvgConnector instance
     */
    SvgConnector.prototype.onDragmove = function (callback) {
        var _this = this;
        this.plug.on('dragmove', function (e) {
            if (_this.isConnect()) {
                _this.plotConnectedCable(_this.connectedReceptor);
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
     * @return SvgConnector instance
     */
    SvgConnector.prototype.onDragend = function (callback) {
        this.plug.on('dragend', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    /**
     * connect to input file plug
     * @param receptor target input file plug
     * @return whether connection is succeed or not
     */
    SvgConnector.prototype.connect = function (receptor) {
        var _this = this;
        if (receptor != null && receptor.connect(this)) {
            // console.log(`connect index=${this.name()} to index=${receptor.name()}`);
            this.connectedReceptor = receptor;
            this.calcConnectPotision(this.connectedReceptor, function (x, y) {
                _this.move(x, y).front();
            }).plotConnectedCable(this.connectedReceptor);
            return true;
        }
        else {
            this.cable.erase();
            this.moveDefault();
        }
        return false;
    };
    /**
     * calc connected plug position
     * @param receptor connected input file plug
     * @param callback The function to call when we get point
     * @return SvgConnector instance
     */
    SvgConnector.prototype.calcConnectPotision = function (receptor, callback) {
        if (this.isConnect() && receptor != null) {
            var transform = receptor.offset();
            var x = receptor.x();
            var y = receptor.y();
            callback(-this.plugConfig.offsetX + x + transform.x, -this.plugConfig.offsetY + y + transform.y);
        }
        return this;
    };
    /**
     * move plug if this plug is not connected
     * @param x x point
     * @param y y point
     * @return SvgConnector instance
     */
    SvgConnector.prototype.moveIfDisconnect = function (x, y) {
        if (!this.isConnect()) {
            this.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    };
    /**
     * plot connected cable
     * @param receptor connected input file plug
     * @return SvgConnector instance
     */
    SvgConnector.prototype.plotConnectedCable = function (receptor) {
        var _this = this;
        if (this.isConnect()) {
            this.calcConnectPotision(receptor, function (x, y) {
                _this.cable.plotEnd(x, y);
            });
        }
        return this;
    };
    /**
     * delete this plug
     * @return SvgConnector instance
     */
    SvgConnector.prototype.delete = function () {
        this.plugConfig.svg = null;
        this.plugConfig.tree = null;
        this.plugConfig.file = null;
        if (this.plug != null) {
            this.plug.off('mousedown', null);
            this.plug.off('dragstart', null);
            this.plug.off('dragmove', null);
            this.plug.off('dragend', null);
            this.plug.remove();
            this.plug = null;
        }
        this.cable.remove();
        return this;
    };
    return SvgConnector;
}(SvgPlugBase));
//# sourceMappingURL=svgConnector.js.map