var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * svg input file plug class
 */
var SvgReceptor = (function (_super) {
    __extends(SvgReceptor, _super);
    /**
     * create new instance
     * @param config plug config
     */
    function SvgReceptor(config) {
        var _this = _super.call(this, config) || this;
        _this.moveDefault();
        return _this;
    }
    /**
     * add a listener for mouseup event
     * @param callback The function to call when we get the mouseup event
     * @return SvgReceptor instance
     */
    SvgReceptor.prototype.onMouseup = function (callback) {
        this.plug.on('mouseup', function (e) {
            callback();
        });
        return this;
    };
    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    SvgReceptor.prototype.isConnect = function () {
        return this.connectedConnector != null;
    };
    /**
     * whether file type is match or not
     * @param filetype file type string ('file' or 'files' or 'directory')
     * @return whether file type is match or not
     */
    SvgReceptor.prototype.isMatchType = function (filetype) {
        var fileTypesRegexp = new RegExp("^(?:" + Object.keys(config.file_types).map(function (key) { return config.file_types[key]; }).join('|') + ")$");
        return filetype.match(fileTypesRegexp) ? true : false;
    };
    /**
     * connect to output file plug
     * @param connector target output file plug
     * @return whether connection is succeed or not
     */
    SvgReceptor.prototype.connect = function (connector) {
        var receptorFiletype = this.getFileType();
        var connectorFiletype = connector.getFileType();
        if (!this.isMatchType(receptorFiletype) || !this.isMatchType(connectorFiletype)) {
            return false;
        }
        if (receptorFiletype.match(new RegExp("^" + connectorFiletype))) {
            if (!this.isConnect()) {
                this.connectedConnector = connector;
                return true;
            }
        }
        return false;
    };
    /**
     * move plug if this plug is connected
     * @param x x point
     * @param y y point
     * @return SvgReceptor instance
     */
    SvgReceptor.prototype.moveIfConnectedPlug = function (x, y) {
        var _this = this;
        this.move(x, y);
        if (this.isConnect()) {
            this.connectedConnector.calcConnectPotision(this, function (x, y) {
                _this.connectedConnector.move(x, y);
            });
            this.connectedConnector.plotConnectedCable(this);
        }
        return this;
    };
    /**
     * move front if this plug is connected
     * @return SvgReceptor instance
     */
    SvgReceptor.prototype.frontIfConnectedPlug = function () {
        if (this.isConnect()) {
            this.connectedConnector.front();
        }
        else {
            this.front();
        }
        return this;
    };
    /**
     * delete connection
     * @return SvgReceptor instance
     */
    SvgReceptor.prototype.deleteConnect = function () {
        this.connectedConnector = null;
        return this;
    };
    /**
     * delete this plug
     * @return SvgReceptor instance
     */
    SvgReceptor.prototype.delete = function () {
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
    return SvgReceptor;
}(SvgPlugBase));
//# sourceMappingURL=svgReceptor.js.map