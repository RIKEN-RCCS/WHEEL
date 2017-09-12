/**
 * base plug class
 */
class SvgPlugBase {
    /**
     * create new instance
     * @param config plug config
     */
    constructor(config) {
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
    name() {
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
    getFileType() {
        return this.plugConfig.file.type;
    }
    /**
     * get file path
     * @return file path
     */
    getFilepath() {
        if (this.plugConfig.file) {
            return this.plugConfig.file.path;
        }
        return '';
    }
    /**
     * get file path from tree
     * @return file path
     */
    getFilepathFromTree() {
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
    getType() {
        return this.plugConfig.tree.type;
    }
    /**
     * get parent directory name
     * @return parent directory name
     */
    parentDirname() {
        if (this.plugConfig.tree) {
            return this.plugConfig.tree.path;
        }
        return '';
    }
    /**
     * get task index
     * @return task index
     */
    getTaskIndex() {
        return this.taskIndex;
    }
    /**
     * get hash code
     * @return hash code
     */
    getHashCode() {
        return this.hashcode;
    }
    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgPlugBase instance
     */
    move(x, y) {
        if (this.plug != null) {
            this.plug.move(x, y);
        }
        return this;
    }
    /**
     * move to front
     * @return SvgPlugBase instance
     */
    front() {
        if (this.plug != null) {
            this.plug.front();
        }
        return this;
    }
    /**
     * move to back
     * @return SvgPlugBase instance
     */
    back() {
        if (this.plug != null) {
            this.plug.back();
        }
        return this;
    }
    /**
     * get x position
     * @return x position
     */
    x() {
        return this.plug.x();
    }
    /**
     * get y position
     * @return y position
     */
    y() {
        return this.plug.y();
    }
    /**
     * get x offset
     * @return x offset
     */
    offset() {
        return this.plug.transform();
    }
    /**
     * get y offset
     * @return y offset
     */
    delete() {
        this.plugConfig.svg = null;
        this.plug.remove();
        this.plug = null;
        return this;
    }
    /**
     * move default position
     * @return SvgPlugBase instance
     */
    moveDefault() {
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
    createPlug(svg, isFileRelation) {
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
    isCircularReference(before, after) {
        const parent = this.plugConfig.tree.getParent();
        const beforeIndex = before.getHashCode();
        const afterIndex = after.getHashCode();
        return parent.isExistCircularReference(beforeIndex, afterIndex);
    }
}
/**
 * counter for definition unieue index number
 */
SvgPlugBase.counter = 0;
//# sourceMappingURL=svgPlugBase.js.map