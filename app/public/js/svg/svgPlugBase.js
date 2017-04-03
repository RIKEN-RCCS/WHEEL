/**
 * base plug class
 */
var SvgPlugBase = (function () {
    /**
     * create new instance
     * @param config plug config
     */
    function SvgPlugBase(config) {
        this.plugConfig = config;
        var isFileRelation = config.file !== undefined;
        this.plug = this.createPlug(config.svg, isFileRelation).fill(config.color);
        var bbox = this.plug.bbox();
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
    SvgPlugBase.prototype.name = function () {
        if (this.plugConfig.file) {
            return this.index + "_" + this.hashcode + "_" + this.plugConfig.file.path;
        }
        else {
            return this.index + "_" + this.hashcode;
        }
    };
    /**
     * get file type
     * @return file type ('file' or 'files' or 'directory')
     */
    SvgPlugBase.prototype.getFileType = function () {
        return this.plugConfig.file.type;
    };
    /**
     * get file path
     * @return file path
     */
    SvgPlugBase.prototype.getFilepath = function () {
        if (this.plugConfig.file) {
            return this.plugConfig.file.path;
        }
        return '';
    };
    /**
     * get file path from tree
     * @return file path
     */
    SvgPlugBase.prototype.getFilepathFromTree = function () {
        if (this.plugConfig.file) {
            if (this.plugConfig.tree) {
                return "./" + ClientUtility.normalize(this.plugConfig.tree.path, this.plugConfig.file.path);
            }
            else {
                return this.plugConfig.file.path;
            }
        }
        return '';
    };
    /**
     * get json file type (ex 'Task', 'Workflow' etc)
     */
    SvgPlugBase.prototype.getType = function () {
        return this.plugConfig.tree.type;
    };
    /**
     * get parent directory name
     * @return parent directory name
     */
    SvgPlugBase.prototype.parentDirname = function () {
        if (this.plugConfig.tree) {
            return this.plugConfig.tree.path;
        }
        return '';
    };
    /**
     * get task index
     * @return task index
     */
    SvgPlugBase.prototype.getTaskIndex = function () {
        return this.taskIndex;
    };
    /**
     * get hash code
     * @return hash code
     */
    SvgPlugBase.prototype.getHashCode = function () {
        return this.hashcode;
    };
    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgPlugBase instance
     */
    SvgPlugBase.prototype.move = function (x, y) {
        if (this.plug != null) {
            this.plug.move(x, y);
        }
        return this;
    };
    /**
     * move to front
     * @return SvgPlugBase instance
     */
    SvgPlugBase.prototype.front = function () {
        if (this.plug != null) {
            this.plug.front();
        }
        return this;
    };
    /**
     * move to back
     * @return SvgPlugBase instance
     */
    SvgPlugBase.prototype.back = function () {
        if (this.plug != null) {
            this.plug.back();
        }
        return this;
    };
    /**
     * get x position
     * @return x position
     */
    SvgPlugBase.prototype.x = function () {
        return this.plug.x();
    };
    /**
     * get y position
     * @return y position
     */
    SvgPlugBase.prototype.y = function () {
        return this.plug.y();
    };
    /**
     * get x offset
     * @return x offset
     */
    SvgPlugBase.prototype.offset = function () {
        return this.plug.transform();
    };
    /**
     * get y offset
     * @return y offset
     */
    SvgPlugBase.prototype.delete = function () {
        this.plugConfig.svg = null;
        this.plug.remove();
        this.plug = null;
        return this;
    };
    /**
     * move default position
     * @return SvgPlugBase instance
     */
    SvgPlugBase.prototype.moveDefault = function () {
        this.plug
            .move(this.plugConfig.originX, this.plugConfig.originY)
            .translate(this.plugConfig.offsetX, this.plugConfig.offsetY);
        return this;
    };
    /**
     * create plug
     * @param svg draw canvas
     * @param isFileRelation whether plug is file or not
     * @return create plug
     */
    SvgPlugBase.prototype.createPlug = function (svg, isFileRelation) {
        if (!isFileRelation) {
            return svg.polygon([[0, 0], [20, 0], [20, 5], [10, 10], [0, 5]]);
        }
        else {
            return svg.polygon([[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]]);
        }
    };
    /**
     * whether circular reference is occurred or not
     * @param before before plug instancec
     * @param after after plug instance
     * @return whether circular reference is occurred or not
     */
    SvgPlugBase.prototype.isCircularReference = function (before, after) {
        var parent = this.plugConfig.tree.getParent();
        var beforeIndex = before.getTaskIndex();
        var afterIndex = after.getTaskIndex();
        return parent.isExistCircularReference(beforeIndex, afterIndex);
    };
    return SvgPlugBase;
}());
/**
 * counter for definition unieue index number
 */
SvgPlugBase.counter = 0;
//# sourceMappingURL=svgPlugBase.js.map