/**
 * plug config
 */
interface PlugConfig {
    /**
     * draw canvas
     */
    svg: svgjs.Doc;
    /**
     * start x point
     */
    readonly originX: number,
    /**
     * start y point
     */
    readonly originY: number,
    /**
     * x offset from svg box
     */
    offsetX: number;
    /**
     * y offset from svg box
     */
    offsetY: number;
    /**
     * color string
     */
    readonly color: string;
    /**
     * plug had tree
     */
    tree: SwfTree;
    /**
     * file data for input and output files plug
     */
    file?: SwfFile;
}

/**
 * base plug class
 */
class SvgPlugBase {
    /**
     * plug
     */
    protected plug: svgjs.Element;
    /**
     * plug width
     */
    protected plugWidth: number;
    /**
     * plug height
     */
    protected plugHeight: number;
    /**
     * plug config
     */
    protected plugConfig: PlugConfig;
    /**
     * unieue index number
     */
    private index: number;
    /**
     * task index number
     */
    private taskIndex: number;
    /**
     * hash code
     */
    private hashcode: number;
    /**
     * counter for definition unieue index number
     */
    private static counter: number = 0;

    /**
     * create new instance
     * @param config plug config
     */
    public constructor(config: PlugConfig) {
        this.plugConfig = config;
        const isFileRelation = config.file !== undefined;
        this.plug = this.createPlug(config.svg, isFileRelation).fill(config.color);
        const bbox = this.plug.bbox();
        this.plugWidth = bbox.width;
        this.plugHeight = bbox.height;
        this.index = SvgPlugBase.counter++;
        this.taskIndex = config.tree.getTaskIndex();
        this.hashcode = config.tree.getHashCode();
    }

    /**
     * get plug name
     * @return plug name
     */
    public name(): string {
        if (this.plugConfig.file) {
            return `${this.index}_${this.hashcode}_${this.plugConfig.file.path}`;
        }
        else {
            return `${this.index}_${this.hashcode}`;
        }
    }

    /**
     * get file type
     * @return file type ('file' or 'files' or 'directory')
     */
    public getFileType(): string {
        return this.plugConfig.file.type;
    }

    /**
     * get file path
     * @return file path
     */
    public getFilepath(): string {
        if (this.plugConfig.file) {
            return this.plugConfig.file.path;
        }
        return '';
    }

    /**
     * get file path from tree
     * @return file path
     */
    public getFilepathFromTree(): string {
        if (this.plugConfig.file) {
            if (this.plugConfig.tree) {
                return `./${ClientUtility.normalize(this.plugConfig.tree.path, this.plugConfig.file.path)}`;
            }
            else {
                return this.plugConfig.file.path;
            }
        }
        return '';
    }

    /**
     * get json file type (ex 'Task', 'Workflow' etc)
     */
    public getType(): SwfType {
        return this.plugConfig.tree.type;
    }

    /**
     * get parent directory name
     * @return parent directory name
     */
    public parentDirname(): string {
        if (this.plugConfig.tree) {
            return this.plugConfig.tree.path;
        }
        return '';
    }

    /**
     * get task index
     * @return task index
     */
    public getTaskIndex(): number {
        return this.taskIndex;
    }

    /**
     * get hash code
     * @return hash code
     */
    public getHashCode(): number {
        return this.hashcode;
    }

    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgPlugBase instance
     */
    public move(x: number, y: number): SvgPlugBase {
        if (this.plug != null) {
            this.plug.move(x, y);
        }
        return this;
    }

    /**
     * move to front
     * @return SvgPlugBase instance
     */
    public front(): SvgPlugBase {
        if (this.plug != null) {
            this.plug.front();
        }
        return this;
    }

    /**
     * move to back
     * @return SvgPlugBase instance
     */
    public back(): SvgPlugBase {
        if (this.plug != null) {
            this.plug.back();
        }
        return this;
    }

    /**
     * get x position
     * @return x position
     */
    public x(): number {
        return this.plug.x();
    }

    /**
     * get y position
     * @return y position
     */
    public y(): number {
        return this.plug.y();
    }

    /**
     * get x offset
     * @return x offset
     */
    public offset(): svgjs.Transform {
        return this.plug.transform();
    }

    /**
     * get y offset
     * @return y offset
     */
    public delete(): SvgPlugBase {
        this.plugConfig.svg = null;
        this.plug.remove();
        this.plug = null;
        return this;
    }

    /**
     * move default position
     * @return SvgPlugBase instance
     */
    protected moveDefault(): SvgPlugBase {
        this.plug
            .move(this.plugConfig.originX, this.plugConfig.originY)
            .translate(this.plugConfig.offsetX, this.plugConfig.offsetY);
        return this;
    }

    /**
     * create plug
     * @param svg draw canvas
     * @param isFileRelation whether plug is file or not
     * @return create plug
     */
    private createPlug(svg: svgjs.Element, isFileRelation: boolean): svgjs.Element {
        if (!isFileRelation) {
            return svg.polygon([[0, 0], [20, 0], [20, 5], [10, 10], [0, 5]]);
        }
        else {
            return svg.polygon([[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]]);
        }
    }

    /**
     * whether circular reference is occurred or not
     * @param before before plug instancec
     * @param after after plug instance
     * @return whether circular reference is occurred or not
     */
    public isCircularReference(before: SvgPlugBase, after: SvgPlugBase): boolean {
        const parent = this.plugConfig.tree.getParent();
        const beforeIndex = before.getTaskIndex();
        const afterIndex = after.getTaskIndex();
        return parent.isExistCircularReference(beforeIndex, afterIndex);
    }
}