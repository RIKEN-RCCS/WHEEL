
interface SwfFileType {
    file: string;
    files: string;
    directory: string;
}

interface PlugConfig {
    svg: svgjs.Doc;
    originX: number,
    originY: number,
    offsetX: number;
    offsetY: number;
    color: string;
    taskIndex: number;
    file?: SwfFile;
}

class SvgPlugBase {

    protected plug: svgjs.Element;
    protected plugWidth: number;
    protected plugHeight: number;
    protected plugConfig: PlugConfig;
    private index: number;
    private static counter: number = 0;

    public constructor(config: PlugConfig) {
        this.plugConfig = config;
        const isStream = config.file === undefined;
        this.plug = SvgPlugBase.createPlug(config.svg, isStream).fill(config.color);
        const bbox = this.plug.bbox();
        this.plugWidth = bbox.width;
        this.plugHeight = bbox.height;
        this.index = SvgPlugBase.counter++;
    }

    public getName(): string {
        if (this.plugConfig.file) {
            return `${this.index}_${this.plugConfig.taskIndex}_${this.plugConfig.file.path}`;
        }
        else {
            return `${this.index}_${this.plugConfig.taskIndex}`;
        }
    }

    public getFileType(): string {
        return this.plugConfig.file.type;
    }

    public getFilepath(): string {
        if (this.plugConfig.file) {
            return this.plugConfig.file.path;
        }
        return '';
    }

    public getTaskIndex(): number {
        return this.plugConfig.taskIndex;
    }

    public getTaskFileIndex(): string {
        return `${this.plugConfig.taskIndex}_${this.plugConfig.file.path}`;
    }

    public move(x: number, y: number): SvgPlugBase {
        this.plug.move(x, y);
        return this;
    }

    public front(): SvgPlugBase {
        this.plug.front();
        return this;
    }

    public back(): SvgPlugBase {
        this.plug.back();
        return this;
    }

    public translate(x: number, y: number): SvgPlugBase {
        this.plug.translate(x, y);
        return this;
    }

    public x(): number {
        return this.plug.x();
    }

    public y(): number {
        return this.plug.y();
    }

    public rotate(d: number): SvgPlugBase {
        this.plug.rotate(d);
        return this;
    }

    public offset(): svgjs.Transform {
        return this.plug.transform();
    }

    public remove(): SvgPlugBase {
        this.plug.remove();
        return this;
    }

    protected moveDefault(): SvgPlugBase {
        this.plug
            .move(this.plugConfig.originX, this.plugConfig.originY)
            .translate(this.plugConfig.offsetX, this.plugConfig.offsetY);
        return this;
    }

    public static createPlug(svg: svgjs.Element, isStream: boolean): svgjs.Element {
        if (isStream) {
            return svg.polygon([[0, 0], [16, 0], [16, 8], [8, 16], [0, 8]]);
        }
        else {
            return svg.polygon([[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]]);
        }
    }
}

class SvgConnector extends SvgPlugBase {

    private receptor: SvgReceptor;
    private cable: SvgCable;

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

    public isConnect(): boolean {
        return this.receptor != null;
    }

    public onDragstart(callback: (() => void)): SvgConnector {
        this.plug.on('dragstart', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    public onMousedown(callback: ((receptor: SvgReceptor) => void)): SvgConnector {
        this.plug.on('mousedown', () => {
            const receptor = this.receptor;
            if (this.isConnect()) {
                console.log(`disconnect index=${this.getName()} to index=${this.receptor.getName()}`);
                this.receptor.deleteConnect();
                this.receptor = null;
            }
            else {
                this.cable.plotStart(this.x(), this.y());
            }
            callback(receptor);
        });
        return this;
    }

    public onDragmove(callback: (() => void)): SvgConnector {
        this.plug.on('dragmove', e => {
            if (this.isConnect()) {
                this.plotConnectedCable(this.receptor);
            }
            else {
                this.cable.plotEnd(this.x(), this.y());
            }
            callback();
        });
        return this;
    }

    public onDragend(callback: (() => void)): SvgConnector {
        this.plug.on('dragend', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    public connect(receptor: SvgReceptor): boolean {
        if (receptor != null && receptor.connect(this)) {
            console.log(`connect index=${this.getName()} to index=${receptor.getName()}`);

            this.receptor = receptor;
            this.calcConnectPotision(this.receptor, (x: number, y: number) => {
                this.move(x, y).front();
            }).plotConnectedCable(this.receptor);
            return true;
        }
        else {
            this.cable.delete();
            this.moveDefault();
        }
        return false;
    }

    public calcConnectPotision(receptor: SvgReceptor, callback: ((x: number, y: number) => void)): SvgConnector {
        if (this.isConnect() && receptor != null) {
            const transform = receptor.offset();
            const x = receptor.x();
            const y = receptor.y();
            callback(-this.plugConfig.offsetX + x + transform.x, -this.plugConfig.offsetY + y + transform.y);
        }
        return this;
    }

    public moveIfDisconnect(x: number, y: number): SvgConnector {
        if (!this.isConnect()) {
            this.plug.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    }

    public plotConnectedCable(receptor: SvgReceptor): SvgConnector {
        if (this.isConnect()) {
            this.calcConnectPotision(receptor, (x: number, y: number) => {
                this.cable.plotEnd(x, y);
            });
        }
        return this;
    }
}

class SvgReceptor extends SvgPlugBase {

    private connector: SvgConnector;
    public constructor(config: PlugConfig) {
        super(config);
        this.moveDefault();
    }

    public onMouseup(callback: (() => void)): SvgReceptor {
        this.plug.on('mouseup', e => {
            callback();
        });
        return this;
    }

    public isConnect(): boolean {
        return this.connector != null;
    }

    private isMatchType(filetype: string): boolean {
        const fileTypesRegexp = new RegExp(`^(?:${Object.keys(config.file_types).map(key => config.file_types[key]).join('|')})$`);
        return filetype.match(fileTypesRegexp) ? true : false;
    }

    public connect(connector: SvgConnector): boolean {
        const receptorFiletype = this.getFileType();
        const connectorFiletype = connector.getFileType();

        if (!this.isMatchType(receptorFiletype) || !this.isMatchType(connectorFiletype)) {
            return false;
        }
        if (receptorFiletype.match(new RegExp(`^${connectorFiletype}`))) {
            if (!this.isConnect()) {
                this.connector = connector;
                return true;
            }
        }
        return false;
    }

    public moveIfConnectedPlug(x: number, y: number): SvgReceptor {
        this.move(x, y);
        if (this.isConnect()) {
            this.connector.calcConnectPotision(this, (x: number, y: number) => {
                this.connector.move(x, y);
            });
            this.connector.plotConnectedCable(this);
        }
        return this;
    }

    public frontIfConnectedPlug(): SvgReceptor {
        if (this.isConnect()) {
            this.connector.front();
        }
        else {
            this.front();
        }
        return this;
    }

    public deleteConnect(): SvgReceptor {
        this.connector = null;
        return this;
    }
}

class SvgUpper extends SvgPlugBase {
    private lowers: { [key: string]: SvgLower } = {};
    public constructor(config: PlugConfig) {
        super(config);
        this.plugConfig.offsetX -= this.plugWidth / 2;
        this.plugConfig.offsetY -= 5;
        this.moveDefault();
    }

    public isConnect(): boolean {
        return Object.keys(this.lowers).length > 0;
    }

    public connect(lower: SvgLower): boolean {
        const taskIndex = lower.getTaskIndex();
        if (!this.lowers[taskIndex]) {
            this.lowers[taskIndex] = lower;
            return true;
        }
        else {
            return false;
        }
    }

    public onMouseup(callback: (() => void)): SvgUpper {
        this.plug.on('mouseup', e => {
            callback();
        });
        return this;
    }

    public moveIfConnectedPlug(x: number, y: number): SvgUpper {
        this.move(x, y);
        Object.keys(this.lowers).forEach(key => {
            this.lowers[key].calcConnectPotision(this, (x: number, y: number) => {
                this.lowers[key].move(x, y);
            });
            this.lowers[key].plotConnectedCable(this);
        });
        return this;
    }

    public frontIfConnectedPlug(): SvgUpper {
        if (this.isConnect()) {
            Object.keys(this.lowers).forEach(key => {
                this.lowers[key].front();
            });
            this.back();
        }
        return this;
    }

    public deleteConnect(lower: SvgLower): SvgUpper {
        delete this.lowers[lower.getTaskIndex()];
        return this;
    }
}

class SvgLower extends SvgPlugBase {

    private upper: SvgUpper;
    private cable: SvgCable;

    public constructor(config: PlugConfig) {
        super(config);
        this.plugConfig.offsetX -= this.plugWidth / 2;
        this.plugConfig.offsetY -= 5;
        this.moveDefault();
        this.plug.draggable();

        const cable = this.plugConfig.svg.path('').fill('none').stroke({ color: this.plugConfig.color, width: 2 });
        this.cable = new SvgCable(cable, this.x(), this.y(), (startX: number, startY: number, endX: number, endY: number) => {
            const sx = this.plugConfig.offsetX + startX + this.plugWidth / 2;
            const sy = this.plugConfig.offsetY + startY + this.plugHeight / 2;
            const ex = this.plugConfig.offsetX + endX + this.plugWidth / 2;
            const ey = this.plugConfig.offsetY + endY + this.plugHeight / 2;
            const my = (sy + ey) / 2;
            const plot: string[] = [
                'M',
                `${sx} ${sy}`,
                'C',
                `${sx} ${my}`,
                `${ex} ${my}`,
                `${ex} ${ey}`
            ];

            return plot.join(' ');
        });
    }

    public isConnect(): boolean {
        return this.upper != null;
    }

    public onDragstart(callback: (() => void)): SvgLower {
        this.plug.on('dragstart', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    public onMousedown(callback: ((upper: SvgUpper) => void)): SvgLower {
        this.plug.on('mousedown', e => {
            e.preventDefault();

            const upper = this.upper;
            if (this.isConnect()) {
                console.log(`disconnect ${this.getName()} to ${this.upper.getName()}`);
                this.upper.deleteConnect(this);
                this.upper = null;
            }
            else {
                this.cable.plotStart(this.x(), this.y());
            }

            callback(upper);
        });
        return this;
    }

    public onDragmove(callback: (() => void)): SvgLower {
        this.plug.on('dragmove', e => {
            if (this.isConnect()) {
                this.plotConnectedCable(this.upper);
            }
            else {
                this.cable.plotEnd(this.x(), this.y());
            }
            callback();
        });
        return this;
    }

    public onDragend(callback: (() => void)): SvgLower {
        this.plug.on('dragend', e => {
            e.preventDefault();
            callback();
        });
        return this;
    }

    public connect(upper: SvgUpper): boolean {
        if (upper != null && upper.connect(this)) {
            console.log(`connect lower=${this.getName()} to upper=${upper.getName()}`);
            this.upper = upper;
            this.calcConnectPotision(this.upper, (x: number, y: number) => {
                this.move(x, y).front();
            }).plotConnectedCable(this.upper);
            return true;
        }
        else {
            this.cable.delete();
            this.moveDefault();
            return false;
        }
    }

    public moveIfDisconnect(x: number, y: number): SvgLower {
        if (!this.isConnect()) {
            this.plug.move(x, y);
        }
        else {
            this.cable.plotStart(x, y);
        }
        return this;
    }

    public calcConnectPotision(upper: SvgUpper, callback: ((x: number, y: number) => void)): SvgLower {
        if (this.isConnect() && upper != null) {
            const offset = upper.offset();
            const x = upper.x();
            const y = upper.y();
            callback(-this.plugConfig.offsetX + x + offset.x, -this.plugConfig.offsetY + y + offset.y);
        }
        return this;
    }

    public plotConnectedCable(upper: SvgUpper): SvgLower {
        if (this.isConnect()) {
            this.calcConnectPotision(upper, (x: number, y: number) => {
                this.cable.plotEnd(x, y);
            });
        }
        return this;
    }
}

/**
 * cable class
 */
class SvgCable {

    /**
     * cable element
     */
    private cable: svgjs.Element;
    /**
     * x coordinate of start point
     */
    private startX: number;
    /**
     * y coordinate of start point
     */
    private startY: number;
    /**
     * x coordinate of end point
     */
    private endX: number;
    /**
     * y coordinate of end point
     */
    private endY: number;
    /**
     * plot cable callback function
     */
    private plotCallback: ((startX: number, startY: number, endX: number, endY: number) => string);

    /**
     *
     * @param cable
     * @param startX
     * @param startY
     * @param plotCallback
     */
    public constructor(cable: svgjs.Element, startX: number, startY: number, plotCallback) {
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
    public plotStart(x: number, y: number): void {
        this.startX = x;
        this.startY = y;
        this.plotCable();
    }

    /**
     *
     * @param x
     * @param y
     */
    public plotEnd(x: number, y: number): void {
        this.endX = x;
        this.endY = y;
        this.plotCable();
    }

    /**
     *
     */
    private plotCable(): void {
        if (this.endX && this.endY) {
            const plot: string = this.plotCallback(this.startX, this.startY, this.endX, this.endY);
            this.cable.plot(plot).back();
        }
    }

    /**
     *
     */
    public delete(): void {
        this.cable.plot('');
        this.endX = undefined;
        this.endY = undefined;
    }
}
