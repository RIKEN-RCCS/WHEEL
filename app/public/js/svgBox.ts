/**
 * svg box class
 */
class SvgBox {
    /**
     * draw canvas
     */
    private draw: svgjs.Doc;
    /**
     * box group
     */
    private group: svgjs.Element;
    /**
     * outer frame
     */
    private outerFrame: svgjs.Element;
    /**
     * inner frame
     */
    private innerFrame: svgjs.Element;
    /**
     * title text
     */
    private title: svgjs.Element;
    /**
     * input files group
     */
    private inputGroup: svgjs.Element;
    /**
     * output files group
     */
    private outputGroup: svgjs.Element;
    /**
     * tree instance
     */
    private tree: SwfTree;
    /**
     * position
     */
    private position: Position2D;
    /**
     * current x position
     */
    private startX: number;
    /**
     * current y position
     */
    private startY: number;
    /**
     * box width
     */
    private width: number;
    /**
     * box height
     */
    private height: number;
    /**
     * not selected opacity
     */
    private static opacity = 0.6;
    /**
     * frame storke width
     */
    private static strokeWidth = 2;
    /**
     * title height
     */
    private static titleHeight = 20;

    /**
     * create new instance
     * @param draw draw canvas
     * @param tree target tree instance
     * @param position init position
     */
    public constructor(draw: svgjs.Doc, tree: SwfTree, position: Position2D) {
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
    private create(): SvgBox {
        const input = this.createInput();
        const output = this.createOutput();
        const outputBBox = output.bbox();
        const inputBBox = input.bbox();

        const bodyHeight = 12 + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
        this.height = bodyHeight + SvgBox.titleHeight;

        const title = this.createTitle();
        this.width = Math.ceil(Math.max(inputBBox.width + outputBBox.width, this.title.bbox().width)) + SvgBox.titleHeight * 2;

        output.x(this.width - 8);

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
    }

    /**
     * add a listener for mousedown event
     * @param callback The function to call when we get the mousedown event
     * @return SvgBox instance
     */
    public onMousedown(callback: ((tree: SwfTree) => void)): SvgBox {
        this.group.on('mousedown', (e: Event) => {
            e.preventDefault();
            this.group.style('cursor', 'move');
            callback(this.tree);
        });
        return this;
    }

    /**
     * add a listener for double click event
     * @param callback The function to call when we get the double click event
     * @return SvgBox instance
     */
    public onDblclick(callback: ((tree: SwfTree) => void)): SvgBox {
        this.group.on('dblclick', (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            callback(this.tree);
        });
        return this;
    }

    /**
     * add a listener for dragstart event
     * @param callback The function to call when we get the dragstart event
     * @return SvgBox instance
     */
    public onDragstart(callback: (() => void)) {
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
    public onDragmove(callback: ((x: number, y: number) => void)): SvgBox {
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
    public onDragend(callback: ((x: number, y: number) => void)): SvgBox {
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
    public front(): SvgBox {
        this.group.front();
        return this;
    }

    /**
     * get x point
     * @return x point
     */
    public x(): number {
        return this.position.x;
    }

    /**
     * get y point
     * @return y point
     */
    public y(): number {
        return this.position.y;
    }

    /**
     * move to specified point
     * @param x x point
     * @param y y point
     * @return SvgBox instance
     */
    public move(x: number, y: number): SvgBox {
        this.position.x = x;
        this.position.y = y;
        this.group.move(x, y);
        return this;
    }

    /**
     * get box height
     * @return box height
     */
    public getHeight(): number {
        return this.height;
    }

    /**
     * get box width
     * @return box width
     */
    public getWidth(): number {
        return this.width;
    }

    /**
     * select box
     * @return SvgBox instance
     */
    public select(): SvgBox {
        this.group.opacity(1.0);
        return this;
    }

    /**
     * unselect box
     * @return SvgBox instance
     */
    public unselect(): SvgBox {
        this.group.opacity(SvgBox.opacity);
        return this;
    }

    /**
     * create outer frame
     * @return outer frame group
     */
    private createOuterFrame(): svgjs.Element {
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
    }

    /**
     * create inner frame
     * @return inner frame group
     */
    private createInnerFrame(): svgjs.Element {
        this.innerFrame = this.draw
            .rect(0, 0)
            .attr({
                'fill': 'rgb(50, 50, 50)',
                'stroke': config.node_color[this.tree.type.toLowerCase()],
                'stroke-width': SvgBox.strokeWidth
            })
            .move(SvgBox.strokeWidth / 2, SvgBox.titleHeight);
        return this.innerFrame;
    }

    /**
     * create title text
     * @return title text
     */
    private createTitle(): svgjs.Element {
        this.title = this.draw
            .text(this.tree.name)
            .fill('#111')
            .x(SvgBox.titleHeight / 2)
            .cy(SvgBox.titleHeight / 2);
        return this.title;
    }

    /**
     * create output file text
     * @return output file text
     */
    private createOutput(): svgjs.Element {
        if (ClientUtility.isImplimentsCondition(this.tree)) {
            return this.outputGroup;
        }
        this.tree.output_files.forEach((output, index) => {
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
    private createInput(): svgjs.Element {
        this.tree.input_files.forEach((input, index) => {
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
     * create condition frame extension
     */
    private createConditionFrame(): void {
        if (ClientUtility.isImplimentsCondition(this.tree)) {
            const polygon = this.draw
                .polygon([
                    [this.width - 4, 0],
                    [this.width, 0],
                    [this.width + 16, this.height / 2],
                    [this.width, this.height + 1],
                    [this.width - 4, this.height + 1]
                ])
                .fill(config.node_color[this.tree.type.toLowerCase()]);
            this.group.add(polygon);
        }
    }

    /**
     * delete this box
     */
    public delete() {
        this.draw = null;
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
    public static caclPlugPosY(index: number): number {
        return SvgBox.titleHeight + 5 + index * 25;
    }
}