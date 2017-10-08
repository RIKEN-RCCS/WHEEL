import SVG from 'svgjs/dist/svg.js';
/**
 * svg box class
 */
class SvgBox {
    /**
     * create new instance
     * @param draw draw canvas
     * @param position init position
     */
    constructor(id, position, type, name, inputFiles, outputFiles) {
        this.draw = SVG(id);
        this.group = this.draw.group();
        this.inputGroup = this.draw.group();
        this.outputGroup = this.draw.group();

        this.position = position;
        this.type=type.toLowerCase();
        this.name=name;
        this.inputFiles=inputFiles;
        this.outputFiles=outputFiles;

        this.create();
    }
    /**
     * create box
     * @return SvgBox instance
     */
    create() {
        const input = this.createInput();
        const output = this.createOutput();
        const outputBBox = output.bbox();
        const inputBBox = input.bbox();
        const bodyHeight = SvgBox.marginHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
        this.height = bodyHeight + SvgBox.titleHeight;
        const title = this.createTitle();
        this.width = Math.ceil(Math.max(inputBBox.width + outputBBox.width, this.title.bbox().width)) + SvgBox.marginWidth;
        output.x(this.width + SvgBox.outputTextOffset);
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
    }
    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgBox instance
     */
    onMousedown(callback) {
        this.group.on('mousedown', (e) => {
            e.preventDefault();
            const key = e.button;
            if (key === MouseKeyType.LEFT) {
                this.group.style('cursor', 'move');
                callback();
            }
        });
        return this;
    }
    /**
     * add a listener for double click event
     * @param callback The function to call when we get the double click event
     * @return SvgBox instance
     */
    onDblclick(callback) {
        this.group.on('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            callback();
        });
        return this;
    }
    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgBox instance
     */
    onDragstart(callback) {
        this.group.on('dragstart', e => {
            e.preventDefault();
            this.startX = e.detail.p.x;
            this.startY = e.detail.p.y;
            callback();
            this.select();
        });
    }
    /**
     * add a listener for dragmove event
     * @param callback The function to call when we get the dragmove event
     * @return SvgBox instance
     */
    onDragmove(callback) {
        this.group.on('dragmove', e => {
            const x = this.position.x + e.detail.p.x - this.startX;
            const y = this.position.y + e.detail.p.y - this.startY;
            callback(x, y);
        });
        return this;
    }
    /**
     * add a listener for dragend event
     * @param callback The function to call when we get the dragend event
     * @return SvgBox instance
     */
    onDragend(callback) {
        this.group.on('dragend', e => {
            e.preventDefault();
            this.group.style('cursor', 'default');
            this.position.x = this.group.x();
            this.position.y = this.group.y();
            callback(this.position.x, this.position.y);
        });
        return this;
    }
    /**
     * move to front
     */
    front() {
        this.group.front();
        return this;
    }
    /**
     * get x point
     * @return x point
     */
    x() {
        return this.position.x;
    }
    /**
     * get y point
     * @return y point
     */
    y() {
        return this.position.y;
    }
    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgBox instance
     */
    move(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.group.move(x, y);
        return this;
    }
    /**
     * get box height
     * @return box height
     */
    getHeight() {
        return this.height;
    }
    /**
     * get box width
     * @return box width
     */
    getWidth() {
        return this.width;
    }
    /**
     * select box
     * @return SvgBox instance
     */
    select() {
        this.group.opacity(1.0);
        return this;
    }
    /**
     * unselect box
     * @return SvgBox instance
     */
    unselect() {
        this.group.opacity(SvgBox.opacity);
        return this;
    }
    /**
     * get output text offset
     * @return output text offset
     */
    static getOutputTextOffset() {
        return this.outputTextOffset;
    }
    /**
     * create outer frame
     * @return outer frame group
     */
    createOuterFrame() {
        this.outerFrame = this.draw
            .polygon([
            [SvgBox.titleHeight / 2, 0],
            [this.width, 0],
            [this.width, SvgBox.titleHeight],
            [0, SvgBox.titleHeight],
            [0, SvgBox.titleHeight / 2]
        ])
            .fill(config.node_color[this.type]);
        return this.outerFrame;
    }
    /**
     * create inner frame
     * @return inner frame group
     */
    createInnerFrame() {
        this.innerFrame = this.draw
            .rect(0, 0)
            .attr({
            'fill': 'rgb(50, 50, 50)',
            'stroke': config.node_color[this.type],
            'stroke-width': SvgBox.strokeWidth
        })
            .move(SvgBox.strokeWidth / 2, SvgBox.titleHeight);
        return this.innerFrame;
    }
    /**
     * create title text
     * @return title text
     */
    createTitle() {
        this.title = this.draw
            .text(this.name)
            .fill('#111')
            .x(SvgBox.titleHeight / 2)
            .cy(SvgBox.titleHeight / 2);
        return this.title;
    }
    /**
     * create output file text
     * @return output file text
     */
    createOutput() {
        this.outputFiles.forEach((output, index) => {
            const y = SvgBox.caclPlugPosY(index);
            const text = this.draw
                .text(output.name)
                .fill('white')
                .y(y);
            text.x(-text.bbox().width);
            this.outputGroup.add(text);
        });
        return this.outputGroup;
    }
    /**
     * create input file text
     * @return input file text
     */
    createInput() {
        this.inputFiles.forEach((input, index) => {
            const y = SvgBox.caclPlugPosY(index);
            const text = this.draw
                .text(input.name)
                .fill('white')
                .move(12, y);
            this.inputGroup.add(text);
        });
        return this.inputGroup;
    }
    /**
     * delete this box
     */
    delete() {
        this.group.off('mousedown', null);
        this.group.off('dblclick', null);
        this.group.off('dragstart', null);
        this.group.off('dragmove', null);
        this.group.off('dragend', null);
        this.group.draggable(false);
        this.inputGroup.each((i, children) => {
            children[i].remove();
        });
        this.outputGroup.each((i, children) => {
            children[i].remove();
        });
        this.group.each((i, children) => {
            children[i].remove();
        });
        this.inputGroup.remove();
        this.outputGroup.remove();
        this.group.remove();
    }
    /**
     * calc y position from top
     * @param index index number from top
     * @return y position
     */
    static caclPlugPosY(index) {
        return SvgBox.titleHeight + SvgBox.marginHeight / 2 + index * SvgBox.stepSize;
    }
}
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
