/**
 * svg before task plug class
 */
class SvgUpper extends SvgPlugBase {
    /**
     * create new instance
     * @param config plug config
     */
    constructor(config) {
        super(config);
        /**
         * connected before task plugs
         */
        this.connectedLowers = {};
        this.plugConfig.offsetX -= this.plugWidth / 2;
        this.plugConfig.offsetY -= this.plugHeight / 2;
        this.moveDefault();
    }
    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    isConnect() {
        return Object.keys(this.connectedLowers).length > 0;
    }
    /**
     * connect to output file plug
     * @param lower target before task plug
     * @return whether connection is succeed or not
     */
    connect(lower) {
        if (this.isCircularReference(lower, this)) {
            console.info('it is circular reference!');
            return false;
        }
        const hashcode = lower.getHashCode();
        if (!this.connectedLowers[hashcode]) {
            this.connectedLowers[hashcode] = lower;
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * add a listener for mouseup event
     * @param callback The function to call when we get the mouseup event
     * @return SvgUpper instance
     */
    onMouseup(callback) {
        this.plug.on('mouseup', e => {
            callback();
        });
        return this;
    }
    /**
     * move plug if this plug is connected
     * @param x x point
     * @param y y point
     * @return SvgUpper instance
     */
    moveIfConnectedPlug(x, y) {
        this.move(x, y);
        Object.keys(this.connectedLowers).forEach(key => {
            this.connectedLowers[key].calcConnectPotision(this, (x, y) => {
                this.connectedLowers[key].move(x, y);
            });
            this.connectedLowers[key].plotConnectedCable(this);
        });
        return this;
    }
    /**
     * move front if this plug is connected
     * @return SvgUpper instance
     */
    frontIfConnectedPlug() {
        if (this.isConnect()) {
            Object.keys(this.connectedLowers).forEach(key => {
                this.connectedLowers[key].front();
            });
            this.back();
        }
        return this;
    }
    /**
     * delete connection
     * @param lower delete target befor task plug
     * @return SvgUpper instance
     */
    deleteConnect(lower) {
        delete this.connectedLowers[lower.getHashCode()];
        return this;
    }
    /**
     * delete this plug
     * @return SvgUpper instance
     */
    delete() {
        this.plugConfig.svg = null;
        this.plugConfig.file = null;
        if (this.plug != null) {
            this.plug.off('mouseup', null);
            this.plug.remove();
            this.plug = null;
        }
        return this;
    }
}
//# sourceMappingURL=svgUpper.js.map
