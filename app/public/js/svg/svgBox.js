/**
 * svg box class
 */
var SvgBox = (function () {
    /**
     * create new instance
     * @param draw draw canvas
     * @param tree target tree instance
     * @param position init position
     */
    function SvgBox(draw, tree, position) {
        this.draw = draw;
        this.group = this.draw.group();
        this.inputGroup = this.draw.group();
        this.outputGroup = this.draw.group();
        this.tree = tree;
        this.position = position;
        this.create();
    }
    /**
     * create box
     * @return SvgBox instance
     */
    SvgBox.prototype.create = function () {
        var input = this.createInput();
        var output = this.createOutput();
        var outputBBox = output.bbox();
        var inputBBox = input.bbox();
        var bodyHeight = SvgBox.marginHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
        this.height = bodyHeight + SvgBox.titleHeight;
        var title = this.createTitle();
        this.width = Math.ceil(Math.max(inputBBox.width + outputBBox.width, this.title.bbox().width)) + SvgBox.marginWidth;
        output.x(this.width + SvgBox.outputTextOffset);
        this.createConditionFrame();
        this.group
            .add(this.createOuterFrame())
            .add(this.createInnerFrame())
            .add(title)
            .add(input)
            .add(output)
            .move(this.position.x, this.position.y)
            .style('cursor', 'default')
            .opacity(SvgBox.opacity)
            .draggable();
        this.innerFrame.size(this.width - SvgBox.strokeWidth, bodyHeight);
        return this;
    };
    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgBox instance
     */
    SvgBox.prototype.onMousedown = function (callback) {
        var _this = this;
        this.group.on('mousedown', function (e) {
            e.preventDefault();
            _this.group.style('cursor', 'move');
            callback(_this.tree);
        });
        return this;
    };
    /**
     * add a listener for double click event
     * @param callback The function to call when we get the double click event
     * @return SvgBox instance
     */
    SvgBox.prototype.onDblclick = function (callback) {
        var _this = this;
        this.group.on('dblclick', function (e) {
            e.stopPropagation();
            e.preventDefault();
            callback(_this.tree);
        });
        return this;
    };
    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgBox instance
     */
    SvgBox.prototype.onDragstart = function (callback) {
        var _this = this;
        this.group.on('dragstart', function (e) {
            e.preventDefault();
            _this.startX = e.detail.p.x;
            _this.startY = e.detail.p.y;
            callback();
            _this.select();
        });
    };
    /**
     * add a listener for dragmove event
     * @param callback The function to call when we get the dragmove event
     * @return SvgBox instance
     */
    SvgBox.prototype.onDragmove = function (callback) {
        var _this = this;
        this.group.on('dragmove', function (e) {
            var x = _this.position.x + e.detail.p.x - _this.startX;
            var y = _this.position.y + e.detail.p.y - _this.startY;
            callback(x, y);
        });
        return this;
    };
    /**
     * add a listener for dragend event
     * @param callback The function to call when we get the dragend event
     * @return SvgBox instance
     */
    SvgBox.prototype.onDragend = function (callback) {
        var _this = this;
        this.group.on('dragend', function (e) {
            e.preventDefault();
            _this.group.style('cursor', 'default');
            _this.position.x = _this.group.x();
            _this.position.y = _this.group.y();
            callback(_this.position.x, _this.position.y);
        });
        return this;
    };
    /**
     * move to front
     */
    SvgBox.prototype.front = function () {
        this.group.front();
        return this;
    };
    /**
     * get x point
     * @return x point
     */
    SvgBox.prototype.x = function () {
        return this.position.x;
    };
    /**
     * get y point
     * @return y point
     */
    SvgBox.prototype.y = function () {
        return this.position.y;
    };
    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgBox instance
     */
    SvgBox.prototype.move = function (x, y) {
        this.position.x = x;
        this.position.y = y;
        this.group.move(x, y);
        return this;
    };
    /**
     * get box height
     * @return box height
     */
    SvgBox.prototype.getHeight = function () {
        return this.height;
    };
    /**
     * get box width
     * @return box width
     */
    SvgBox.prototype.getWidth = function () {
        return this.width;
    };
    /**
     * select box
     * @return SvgBox instance
     */
    SvgBox.prototype.select = function () {
        this.group.opacity(1.0);
        return this;
    };
    /**
     * unselect box
     * @return SvgBox instance
     */
    SvgBox.prototype.unselect = function () {
        this.group.opacity(SvgBox.opacity);
        return this;
    };
    /**
     * get output text offset
     * @return output text offset
     */
    SvgBox.getOutputTextOffset = function () {
        return this.outputTextOffset;
    };
    /**
     * create outer frame
     * @return outer frame group
     */
    SvgBox.prototype.createOuterFrame = function () {
        this.outerFrame = this.draw
            .polygon([
            [SvgBox.titleHeight / 2, 0],
            [this.width, 0],
            [this.width, SvgBox.titleHeight],
            [0, SvgBox.titleHeight],
            [0, SvgBox.titleHeight / 2]
        ])
            .fill(config.node_color[this.tree.type.toLowerCase()]);
        return this.outerFrame;
    };
    /**
     * create inner frame
     * @return inner frame group
     */
    SvgBox.prototype.createInnerFrame = function () {
        this.innerFrame = this.draw
            .rect(0, 0)
            .attr({
            'fill': 'rgb(50, 50, 50)',
            'stroke': config.node_color[this.tree.type.toLowerCase()],
            'stroke-width': SvgBox.strokeWidth
        })
            .move(SvgBox.strokeWidth / 2, SvgBox.titleHeight);
        return this.innerFrame;
    };
    /**
     * create title text
     * @return title text
     */
    SvgBox.prototype.createTitle = function () {
        this.title = this.draw
            .text(this.tree.name)
            .fill('#111')
            .x(SvgBox.titleHeight / 2)
            .cy(SvgBox.titleHeight / 2);
        return this.title;
    };
    /**
     * create output file text
     * @return output file text
     */
    SvgBox.prototype.createOutput = function () {
        var _this = this;
        this.tree.output_files.forEach(function (output, index) {
            var y = SvgBox.caclPlugPosY(index);
            var text = _this.draw
                .text(output.name)
                .fill('white')
                .y(y);
            text.x(-text.bbox().width);
            _this.outputGroup.add(text);
        });
        return this.outputGroup;
    };
    /**
     * create input file text
     * @return input file text
     */
    SvgBox.prototype.createInput = function () {
        var _this = this;
        this.tree.input_files.forEach(function (input, index) {
            var y = SvgBox.caclPlugPosY(index);
            var text = _this.draw
                .text(input.name)
                .fill('white')
                .move(12, y);
            _this.inputGroup.add(text);
        });
        return this.inputGroup;
    };
    /**
     * create condition frame extension
     */
    SvgBox.prototype.createConditionFrame = function () {
        if (SwfType.isImplimentsCondition(this.tree)) {
            var polygon = this.draw
                .polygon([
                [this.width - 4, 0],
                [this.width, 0],
                [this.width + 16, this.height / 2],
                [this.width, this.height + SvgBox.strokeWidth / 2],
                [this.width - 4, this.height + SvgBox.strokeWidth / 2]
            ])
                .fill(config.node_color[this.tree.type.toLowerCase()]);
            this.group.add(polygon);
        }
    };
    /**
     * delete this box
     */
    SvgBox.prototype.delete = function () {
        this.draw = null;
        this.group.off('mousedown', null);
        this.group.off('dblclick', null);
        this.group.off('dragstart', null);
        this.group.off('dragmove', null);
        this.group.off('dragend', null);
        this.group.draggable(false);
        this.inputGroup.each(function (i, children) {
            children[i].remove();
        });
        this.outputGroup.each(function (i, children) {
            children[i].remove();
        });
        this.group.each(function (i, children) {
            children[i].remove();
        });
        this.inputGroup.remove();
        this.outputGroup.remove();
        this.group.remove();
    };
    /**
     * calc y position from top
     * @param index index number from top
     * @return y position
     */
    SvgBox.caclPlugPosY = function (index) {
        return SvgBox.titleHeight + SvgBox.marginHeight / 2 + index * SvgBox.stepSize;
    };
    return SvgBox;
}());
/**
 * not selected opacity
 */
SvgBox.opacity = 0.6;
/**
 * frame storke width
 */
SvgBox.strokeWidth = 2;
/**
 * title height
 */
SvgBox.titleHeight = 20;
/**
 * margin of box height
 */
SvgBox.marginHeight = 12;
/**
 * margin of box width
 */
SvgBox.marginWidth = SvgBox.titleHeight * 2;
/**
 * output text offset
 */
SvgBox.outputTextOffset = -8;
/**
 * input and output files step size
 */
SvgBox.stepSize = 25;
//# sourceMappingURL=svgBox.js.map