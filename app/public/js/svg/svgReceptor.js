/**
 * svg input file plug class
 */
class SvgReceptor extends SvgPlugBase {
    /**
     * create new instance
     * @param config plug config
     */
    constructor(config) {
        super(config);
        this.moveDefault();
    }
    /**
     * add a listener for mouseup event
     * @param callback The function to call when we get the mouseup event
     * @return SvgReceptor instance
     */
    onMouseup(callback) {
        this.plug.on('mouseup', e => {
            callback();
        });
        return this;
    }
    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    isConnect() {
        return this.connectedConnector != null;
    }
    /**
     * whether file type is match or not
     * @param filetype file type string ('file' or 'files' or 'directory')
     * @return whether file type is match or not
     */
    isMatchType(filetype) {
        const fileTypesRegexp = new RegExp(`^(?:${SwfFileType.types().join('|')})$`);
        return filetype.match(fileTypesRegexp) ? true : false;
    }
    /**
     * connect to output file plug
     * @param connector target output file plug
     * @return whether connection is succeed or not
     */
    connect(connector) {
        if (this.isCircularReference(connector, this)) {
            console.info('it is circular reference!');
            return false;
        }
        const receptorFiletype = this.getFileType();
        const connectorFiletype = connector.getFileType();
        if (!this.isMatchType(receptorFiletype) || !this.isMatchType(connectorFiletype)) {
            return false;
        }
        if (receptorFiletype.match(new RegExp(`^${connectorFiletype}`))) {
            if (!this.isConnect()) {
                this.connectedConnector = connector;
                return true;
            }
        }
        return false;
    }
    /**
     * move plug if this plug is connected
     * @param x x point
     * @param y y point
     * @return SvgReceptor instance
     */
    moveIfConnectedPlug(x, y) {
        this.move(x, y);
        if (this.isConnect()) {
            this.connectedConnector.calcConnectPotision(this, (x, y) => {
                this.connectedConnector.move(x, y);
            });
            this.connectedConnector.plotConnectedCable(this);
        }
        return this;
    }
    /**
     * move front if this plug is connected
     * @return SvgReceptor instance
     */
    frontIfConnectedPlug() {
        if (this.isConnect()) {
            this.connectedConnector.front();
        }
        else {
            this.front();
        }
        return this;
    }
    /**
     * delete connection
     * @return SvgReceptor instance
     */
    deleteConnect() {
        this.connectedConnector = null;
        return this;
    }
    /**
     * delete this plug
     * @return SvgReceptor instance
     */
    delete() {
        this.plugConfig.svg = null;
        this.plugConfig.tree = null;
        this.plugConfig.file = null;
        if (this.plug != null) {
            this.plug.off('mouseup', null);
            this.plug.remove();
            this.plug = null;
        }
        return this;
    }
}
//# sourceMappingURL=svgReceptor.js.map