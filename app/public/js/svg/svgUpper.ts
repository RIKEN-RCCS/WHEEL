/**
 * svg before task plug class
 */
class SvgUpper extends SvgPlugBase {

    /**
     * connected before task plugs
     */
    private connectedLowers: { [key: string]: SvgLower } = {};

    /**
     * create new instance
     * @param config plug config
     */
    public constructor(config: PlugConfig) {
        super(config);
        this.plugConfig.offsetX -= this.plugWidth / 2;
        this.plugConfig.offsetY -= this.plugHeight / 2;
        this.moveDefault();
    }

    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    public isConnect(): boolean {
        return Object.keys(this.connectedLowers).length > 0;
    }

    /**
     * connect to output file plug
     * @param lower target before task plug
     * @return whether connection is succeed or not
     */
    public connect(lower: SvgLower): boolean {

        if (this.isCircularReference(lower, this)){
            console.info('it is circular reference!');
            return false;
        }

        const taskIndex = lower.getTaskIndex();
        if (!this.connectedLowers[taskIndex]) {
            this.connectedLowers[taskIndex] = lower;
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
    public onMouseup(callback: (() => void)): SvgUpper {
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
    public moveIfConnectedPlug(x: number, y: number): SvgUpper {
        this.move(x, y);
        Object.keys(this.connectedLowers).forEach(key => {
            this.connectedLowers[key].calcConnectPotision(this, (x: number, y: number) => {
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
    public frontIfConnectedPlug(): SvgUpper {
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
    public deleteConnect(lower: SvgLower): SvgUpper {
        delete this.connectedLowers[lower.getTaskIndex()];
        return this;
    }

    /**
     * delete this plug
     * @return SvgUpper instance
     */
    public delete(): SvgUpper {
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