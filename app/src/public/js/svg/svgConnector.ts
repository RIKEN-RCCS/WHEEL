/**
 * svg outout file plug class
 */
class SvgConnector extends SvgPlugBase {

    /**
     * connected input file plug
     */
    private connectedReceptor: SvgReceptor;

    /**
     * cable
     */
    private readonly cable: SvgCable;

    /**
     * create new instance
     * @param config plug config
     */
    public constructor(config: PlugConfig) {
        super(config);
        this.plug.draggable();
        this.moveDefault();
        const cable = this.plugConfig.svg.path('').fill('none').stroke({ color: this.plugConfig.color, width: 2 });
        this.cable = new SvgCable(cable, this.x(), this.y(), (startX: number, startY: number, endX: number, endY: number) => {
            const sx = this.plugConfig.offsetX + startX + this.plugWidth / 2;
            const sy = this.plugConfig.offsetY + startY + this.plugHeight / 2;
            const ex = this.plugConfig.offsetX + endX + this.plugWidth / 2;
            const ey = this.plugConfig.offsetY + endY + this.plugHeight / 2;
            const mx = (sx + ex) / 2;
            const plot: string[] = [
                'M',
                `${sx} ${sy}`,
                'C',
                `${mx} ${sy}`,
                `${mx} ${ey}`,
                `${ex} ${ey}`
            ];
            return plot.join(' ');
        });
    }

    /**
     * whether this plug is connected or not
     * @return whether this plug is connected or not
     */
    public isConnect(): boolean {
        return this.connectedReceptor != null;
    }

    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgConnector instance
     */
    public onDragstart(callback: (() => void)): SvgConnector {
        this.plug.on('dragstart', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgConnector instance
     */
    public onMousedown(callback: ((receptor: SvgReceptor) => void)): SvgConnector {
        this.plug.on('mousedown', () => {
            const receptor = this.connectedReceptor;
            if (this.isConnect()) {
                console.log(`disconnect index=${this.name()} to index=${this.connectedReceptor.name()}`);
                this.connectedReceptor.deleteConnect();
                this.connectedReceptor = null;
            }
            else {
                this.cable.plotStart(this.x(), this.y());
            }
            callback(receptor);
        });
        return this;
    }

    /**
     * add a listener for dragmove event
     * @param callback The function to call when we get the dragmove event
     * @return SvgConnector instance
     */
    public onDragmove(callback: (() => void)): SvgConnector {
        this.plug.on('dragmove', e => {
            if (this.isConnect()) {
                this.plotConnectedCable(this.connectedReceptor);
            }
            else {
                this.cable.plotEnd(this.x(), this.y());
            }
            callback();
        });
        return this;
    }

    /**
     * add a listener for dragend event
     * @param callback The function to call when we get the dragend event
     * @return SvgConnector instance
     */
    public onDragend(callback: (() => void)): SvgConnector {
        this.plug.on('dragend', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    /**
     * connect to input file plug
     * @param receptor target input file plug
     * @return whether connection is succeed or not
     */
    public connect(receptor: SvgReceptor): boolean {
        if (receptor != null && receptor.connect(this)) {
            // console.log(`connect index=${this.name()} to index=${receptor.name()}`);
            this.connectedReceptor = receptor;
            this.calcConnectPotision(this.connectedReceptor, (x: number, y: number) => {
                this.move(x, y).front();
            }).plotConnectedCable(this.connectedReceptor);
            return true;
        }
        else {
            this.cable.erase();
            this.moveDefault();
        }
        return false;
    }

    /**
     * calc connected plug position
     * @param receptor connected input file plug
     * @param callback The function to call when we get point
     * @return SvgConnector instance
     */
    public calcConnectPotision(receptor: SvgReceptor, callback: ((x: number, y: number) => void)): SvgConnector {
        if (this.isConnect() && receptor != null) {
            const transform = receptor.offset();
            const x = receptor.x();
            const y = receptor.y();
            callback(-this.plugConfig.offsetX + x + transform.x, -this.plugConfig.offsetY + y + transform.y);
        }
        return this;
    }

    /**
     * move plug if this plug is not connected
     * @param x x point
     * @param y y point
     * @return SvgConnector instance
     */
    public moveIfDisconnect(x: number, y: number): SvgConnector {
        if (!this.isConnect()) {
            this.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    }

    /**
     * plot connected cable
     * @param receptor connected input file plug
     * @return SvgConnector instance
     */
    public plotConnectedCable(receptor: SvgReceptor): SvgConnector {
        if (this.isConnect()) {
            this.calcConnectPotision(receptor, (x: number, y: number) => {
                this.cable.plotEnd(x, y);
            });
        }
        return this;
    }

    /**
     * delete this plug
     * @return SvgConnector instance
     */
    public delete(): SvgConnector {
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
    }
}