var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SvgPlugBase = (function () {
    function SvgPlugBase(config) {
        this.plugConfig = config;
        var isStream = config.file === undefined;
        this.plug = SvgPlugBase.createPlug(config.svg, isStream).fill(config.color);
        var bbox = this.plug.bbox();
        this.plugWidth = bbox.width;
        this.plugHeight = bbox.height;
        this.index = SvgPlugBase.counter++;
    }
    SvgPlugBase.prototype.getName = function () {
        if (this.plugConfig.file) {
            return this.index + "_" + this.plugConfig.taskIndex + "_" + this.plugConfig.file.path;
        }
        else {
            return this.index + "_" + this.plugConfig.taskIndex;
        }
    };
    SvgPlugBase.prototype.getFileType = function () {
        return this.plugConfig.file.type;
    };
    SvgPlugBase.prototype.getFilepath = function () {
        if (this.plugConfig.file) {
            return this.plugConfig.file.path;
        }
        return '';
    };
    SvgPlugBase.prototype.getTaskIndex = function () {
        return this.plugConfig.taskIndex;
    };
    SvgPlugBase.prototype.getTaskFileIndex = function () {
        return this.plugConfig.taskIndex + "_" + this.plugConfig.file.path;
    };
    SvgPlugBase.prototype.move = function (x, y) {
        this.plug.move(x, y);
        return this;
    };
    SvgPlugBase.prototype.front = function () {
        this.plug.front();
        return this;
    };
    SvgPlugBase.prototype.back = function () {
        this.plug.back();
        return this;
    };
    SvgPlugBase.prototype.translate = function (x, y) {
        this.plug.translate(x, y);
        return this;
    };
    SvgPlugBase.prototype.x = function () {
        return this.plug.x();
    };
    SvgPlugBase.prototype.y = function () {
        return this.plug.y();
    };
    SvgPlugBase.prototype.rotate = function (d) {
        this.plug.rotate(d);
        return this;
    };
    SvgPlugBase.prototype.offset = function () {
        return this.plug.transform();
    };
    SvgPlugBase.prototype.remove = function () {
        this.plug.remove();
        return this;
    };
    SvgPlugBase.prototype.moveDefault = function () {
        this.plug
            .move(this.plugConfig.originX, this.plugConfig.originY)
            .translate(this.plugConfig.offsetX, this.plugConfig.offsetY);
        return this;
    };
    SvgPlugBase.createPlug = function (svg, isStream) {
        if (isStream) {
            return svg.polygon([[0, 0], [16, 0], [16, 8], [8, 16], [0, 8]]);
        }
        else {
            return svg.polygon([[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]]);
        }
    };
    return SvgPlugBase;
}());
SvgPlugBase.counter = 0;
var SvgConnector = (function (_super) {
    __extends(SvgConnector, _super);
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
    SvgConnector.prototype.isConnect = function () {
        return this.receptor != null;
    };
    SvgConnector.prototype.onDragstart = function (callback) {
        this.plug.on('dragstart', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    SvgConnector.prototype.onMousedown = function (callback) {
        var _this = this;
        this.plug.on('mousedown', function () {
            var receptor = _this.receptor;
            if (_this.isConnect()) {
                console.log("disconnect index=" + _this.getName() + " to index=" + _this.receptor.getName());
                _this.receptor.deleteConnect();
                _this.receptor = null;
            }
            else {
                _this.cable.plotStart(_this.x(), _this.y());
            }
            callback(receptor);
        });
        return this;
    };
    SvgConnector.prototype.onDragmove = function (callback) {
        var _this = this;
        this.plug.on('dragmove', function (e) {
            if (_this.isConnect()) {
                _this.plotConnectedCable(_this.receptor);
            }
            else {
                _this.cable.plotEnd(_this.x(), _this.y());
            }
            callback();
        });
        return this;
    };
    SvgConnector.prototype.onDragend = function (callback) {
        this.plug.on('dragend', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    SvgConnector.prototype.connect = function (receptor) {
        var _this = this;
        if (receptor != null && receptor.connect(this)) {
            console.log("connect index=" + this.getName() + " to index=" + receptor.getName());
            this.receptor = receptor;
            this.calcConnectPotision(this.receptor, function (x, y) {
                _this.move(x, y).front();
            }).plotConnectedCable(this.receptor);
            return true;
        }
        else {
            this.cable.delete();
            this.moveDefault();
        }
        return false;
    };
    SvgConnector.prototype.calcConnectPotision = function (receptor, callback) {
        if (this.isConnect() && receptor != null) {
            var transform = receptor.offset();
            var x = receptor.x();
            var y = receptor.y();
            callback(-this.plugConfig.offsetX + x + transform.x, -this.plugConfig.offsetY + y + transform.y);
        }
        return this;
    };
    SvgConnector.prototype.moveIfDisconnect = function (x, y) {
        if (!this.isConnect()) {
            this.plug.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    };
    SvgConnector.prototype.plotConnectedCable = function (receptor) {
        var _this = this;
        if (this.isConnect()) {
            this.calcConnectPotision(receptor, function (x, y) {
                _this.cable.plotEnd(x, y);
            });
        }
        return this;
    };
    return SvgConnector;
}(SvgPlugBase));
var SvgReceptor = (function (_super) {
    __extends(SvgReceptor, _super);
    function SvgReceptor(config) {
        var _this = _super.call(this, config) || this;
        _this.moveDefault();
        return _this;
    }
    SvgReceptor.prototype.onMouseup = function (callback) {
        this.plug.on('mouseup', function (e) {
            callback();
        });
        return this;
    };
    SvgReceptor.prototype.isConnect = function () {
        return this.connector != null;
    };
    SvgReceptor.prototype.isMatchType = function (filetype) {
        var fileTypesRegexp = new RegExp("^(?:" + Object.keys(config.file_types).map(function (key) { return config.file_types[key]; }).join('|') + ")$");
        return filetype.match(fileTypesRegexp) ? true : false;
    };
    SvgReceptor.prototype.connect = function (connector) {
        var receptorFiletype = this.getFileType();
        var connectorFiletype = connector.getFileType();
        if (!this.isMatchType(receptorFiletype) || !this.isMatchType(connectorFiletype)) {
            return false;
        }
        if (receptorFiletype.match(new RegExp("^" + connectorFiletype))) {
            if (!this.isConnect()) {
                this.connector = connector;
                return true;
            }
        }
        return false;
    };
    SvgReceptor.prototype.moveIfConnectedPlug = function (x, y) {
        var _this = this;
        this.move(x, y);
        if (this.isConnect()) {
            this.connector.calcConnectPotision(this, function (x, y) {
                _this.connector.move(x, y);
            });
            this.connector.plotConnectedCable(this);
        }
        return this;
    };
    SvgReceptor.prototype.frontIfConnectedPlug = function () {
        if (this.isConnect()) {
            this.connector.front();
        }
        else {
            this.front();
        }
        return this;
    };
    SvgReceptor.prototype.deleteConnect = function () {
        this.connector = null;
        return this;
    };
    return SvgReceptor;
}(SvgPlugBase));
var SvgUpper = (function (_super) {
    __extends(SvgUpper, _super);
    function SvgUpper(config) {
        var _this = _super.call(this, config) || this;
        _this.lowers = {};
        _this.plugConfig.offsetX -= _this.plugWidth / 2;
        _this.plugConfig.offsetY -= 5;
        _this.moveDefault();
        return _this;
    }
    SvgUpper.prototype.isConnect = function () {
        return Object.keys(this.lowers).length > 0;
    };
    SvgUpper.prototype.connect = function (lower) {
        var taskIndex = lower.getTaskIndex();
        if (!this.lowers[taskIndex]) {
            this.lowers[taskIndex] = lower;
            return true;
        }
        else {
            return false;
        }
    };
    SvgUpper.prototype.onMouseup = function (callback) {
        this.plug.on('mouseup', function (e) {
            callback();
        });
        return this;
    };
    SvgUpper.prototype.moveIfConnectedPlug = function (x, y) {
        var _this = this;
        this.move(x, y);
        Object.keys(this.lowers).forEach(function (key) {
            _this.lowers[key].calcConnectPotision(_this, function (x, y) {
                _this.lowers[key].move(x, y);
            });
            _this.lowers[key].plotConnectedCable(_this);
        });
        return this;
    };
    SvgUpper.prototype.frontIfConnectedPlug = function () {
        var _this = this;
        if (this.isConnect()) {
            Object.keys(this.lowers).forEach(function (key) {
                _this.lowers[key].front();
            });
            this.back();
        }
        return this;
    };
    SvgUpper.prototype.deleteConnect = function (lower) {
        delete this.lowers[lower.getTaskIndex()];
        return this;
    };
    return SvgUpper;
}(SvgPlugBase));
var SvgLower = (function (_super) {
    __extends(SvgLower, _super);
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
    SvgLower.prototype.isConnect = function () {
        return this.upper != null;
    };
    SvgLower.prototype.onDragstart = function (callback) {
        this.plug.on('dragstart', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    SvgLower.prototype.onMousedown = function (callback) {
        var _this = this;
        this.plug.on('mousedown', function (e) {
            e.preventDefault();
            var upper = _this.upper;
            if (_this.isConnect()) {
                console.log("disconnect " + _this.getName() + " to " + _this.upper.getName());
                _this.upper.deleteConnect(_this);
                _this.upper = null;
            }
            else {
                _this.cable.plotStart(_this.x(), _this.y());
            }
            callback(upper);
        });
        return this;
    };
    SvgLower.prototype.onDragmove = function (callback) {
        var _this = this;
        this.plug.on('dragmove', function (e) {
            if (_this.isConnect()) {
                _this.plotConnectedCable(_this.upper);
            }
            else {
                _this.cable.plotEnd(_this.x(), _this.y());
            }
            callback();
        });
        return this;
    };
    SvgLower.prototype.onDragend = function (callback) {
        this.plug.on('dragend', function (e) {
            e.preventDefault();
            callback();
        });
        return this;
    };
    SvgLower.prototype.connect = function (upper) {
        var _this = this;
        if (upper != null && upper.connect(this)) {
            console.log("connect lower=" + this.getName() + " to upper=" + upper.getName());
            this.upper = upper;
            this.calcConnectPotision(this.upper, function (x, y) {
                _this.move(x, y).front();
            }).plotConnectedCable(this.upper);
            return true;
        }
        else {
            this.cable.delete();
            this.moveDefault();
            return false;
        }
    };
    SvgLower.prototype.moveIfDisconnect = function (x, y) {
        if (!this.isConnect()) {
            this.plug.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    };
    SvgLower.prototype.calcConnectPotision = function (upper, callback) {
        if (this.isConnect() && upper != null) {
            var offset = upper.offset();
            var x = upper.x();
            var y = upper.y();
            callback(-this.plugConfig.offsetX + x + offset.x, -this.plugConfig.offsetY + y + offset.y);
        }
        return this;
    };
    SvgLower.prototype.plotConnectedCable = function (upper) {
        var _this = this;
        if (this.isConnect()) {
            this.calcConnectPotision(upper, function (x, y) {
                _this.cable.plotEnd(x, y);
            });
        }
        return this;
    };
    return SvgLower;
}(SvgPlugBase));
/**
 * cable class
 */
var SvgCable = (function () {
    /**
     *
     * @param cable
     * @param startX
     * @param startY
     * @param plotCallback
     */
    function SvgCable(cable, startX, startY, plotCallback) {
        this.plotCallback = plotCallback;
        this.startX = startX;
        this.startY = startY;
        this.cable = cable;
    }
    /**
     *
     * @param x
     * @param y
     */
    SvgCable.prototype.plotStart = function (x, y) {
        this.startX = x;
        this.startY = y;
        this.plotCable();
    };
    /**
     *
     * @param x
     * @param y
     */
    SvgCable.prototype.plotEnd = function (x, y) {
        this.endX = x;
        this.endY = y;
        this.plotCable();
    };
    /**
     *
     */
    SvgCable.prototype.plotCable = function () {
        if (this.endX && this.endY) {
            var plot = this.plotCallback(this.startX, this.startY, this.endX, this.endY);
            this.cable.plot(plot).back();
        }
    };
    /**
     *
     */
    SvgCable.prototype.delete = function () {
        this.cable.plot('');
        this.endX = undefined;
        this.endY = undefined;
    };
    return SvgCable;
}());
//# sourceMappingURL=svgPlugBase.js.map