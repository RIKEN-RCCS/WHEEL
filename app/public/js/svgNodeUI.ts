/**
 *
 */
class SvgContainer {
    /**
     *
     */
    private container: { [name: string]: SvgPlugBase } = {};
    /**
     *
     * @param plug
     */
    public add(plug: SvgPlugBase): void {
        const name = plug.name();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    }
    /**
     *
     * @param name
     */
    public remove(name: string): void;
    /**
     *
     * @param plug
     */
    public remove(plug: SvgPlugBase): void;
    /**
     *
     * @param object
     */
    public remove(object: (string | SvgPlugBase)): void {
        let name: string;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        if (this.container[name]) {
            this.container[name].delete();
            this.container[name] = null;
            delete this.container[name];
        }
    }
    /**
     *
     * @param name
     */
    public isExist(name: string): boolean;
    /**
     *
     * @param plug
     */
    public isExist(plug: SvgPlugBase): boolean;
    /**
     *
     * @param object
     */
    public isExist(object: (string | SvgPlugBase)): boolean {
        let name: string;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        return this.container[name] != null;
    }
    /**
     *
     * @param name
     */
    public find(name: string): SvgPlugBase {
        return this.container[name];
    }
    /**
     *
     */
    public front(): void {
        Object.keys(this.container).forEach(key => {
            this.container[key].front();
        });
    }
    /**
     *
     * @param x
     * @param y
     */
    public move(x, y): void {
        Object.keys(this.container).forEach(key => {
            this.container[key].move(x, y);
        });
    }
    /**
     *
     * @param callback
     */
    public forEach(callback: ((plug) => void)) {
        Object.keys(this.container).forEach(key => {
            callback(this.container[key]);
        });
    }
    /**
     *
     */
    public clear(): void {
        Object.keys(this.container).forEach(key => {
            this.remove(key);
        });
    }
    /**
     *
     * @param taskIndex
     * @param filepath
     */
    public findFromIndex(taskIndex: number, filepath?: string): SvgPlugBase[] {
        return Object.keys(this.container).filter(key => {
            const task = this.container[key].taskIndex();
            if (filepath === undefined) {
                return task == taskIndex;
            }
            else {
                const file = this.container[key].filepathFromTree();
                return (task == taskIndex && file == filepath);
            }
        }).map(key => this.container[key]);
    }
    /**
     *
     * @param callback
     */
    public count(callback: ((plug: SvgPlugBase) => boolean)): number {
        let counter = 0;
        Object.keys(this.container).forEach(key => {
            if (callback(this.container[key])) {
                counter++;
            }
        });
        return counter;
    }
}

class SvgFileRelations {
    /**
     *
     */
    private fileRelations: SwfRelationFile[];

    /**
     *
     * @param fileRelations
     */
    public constructor(fileRelations: SwfRelationFile[]) {
        this.fileRelations = fileRelations;
    }

    /**
     *
     * @param taskIndex
     * @param filepath
     * @param dirname
     */
    public count(taskIndex: number, filepath: string, dirname: string): number {
        const filename = `${taskIndex}_${dirname}/${ClientUtility.normalize(filepath)}`;
        return this.fileRelations
            .filter(relation => relation.getOutputFileName() === filename)
            .length;
    }

    /**
     *
     */
    public setFileRelation(allConnectors: SvgContainer, allReceptors: SvgContainer) {
        if (this.fileRelations == null) {
            return;
        }

        const relaltions: SwfRelationFile[] = JSON.parse(JSON.stringify(this.fileRelations));
        this.clear();
        relaltions.forEach(relation => {
            const connectors = <SvgConnector[]>allConnectors.findFromIndex(relation.index_before_task, relation.path_output_file);
            const receptors = <SvgReceptor[]>allReceptors.findFromIndex(relation.index_after_task, relation.path_input_file);

            if (connectors == null || receptors == null) {
                return;
            }
            connectors.forEach((connector, index) => {
                if (connector.isConnect()) {
                    return;
                }
                receptors.forEach(receptor => {
                    if (receptor.isConnect()) {
                        return;
                    }
                    if (!connector.connect(receptor)) {
                        this.deleteFileRelation(connector, receptor);
                    }
                    else {
                        this.addFileRelation(connector, receptor);
                    }
                });
            });
        });
    }

    /**
     *
     * @param connector
     * @param receptor
     */
    public createFileRelation(connector: SvgConnector, receptor: SvgReceptor): SwfRelationFile {
        if (connector == null || receptor == null) {
            return null;
        }

        const outputPath = ClientUtility.normalize(`${connector.parentDirname()}/${connector.filepath()}`);
        const inputPath = ClientUtility.normalize(`${receptor.parentDirname()}/${receptor.filepath()}`);

        const relation: SwfFileRelationJson = {
            index_before_task: connector.taskIndex(),
            path_output_file: `./${outputPath}`,
            index_after_task: receptor.taskIndex(),
            path_input_file: `./${inputPath}`,
        };
        return new SwfRelationFile(relation);
    }

    /**
     *
     * @param connector
     * @param receptor
     */
    public addFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        const relation = this.createFileRelation(connector, receptor);
        if (relation == null) {
            return;
        }
        this.deleteFileRelation(connector, receptor);
        this.fileRelations.push(relation);
    }

    /**
     *
     * @param connector
     * @param receptor
     */
    public deleteFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        const fileRelation = this.createFileRelation(connector, receptor);
        if (fileRelation == null) {
            return;
        }
        for (let index = this.fileRelations.length - 1; index >= 0; index--) {
            if (this.fileRelations[index].toString() === fileRelation.toString()) {
                this.fileRelations.splice(index, 1);
            }
        }
    }

    /**
     *
     */
    public clear() {
        this.fileRelations.splice(0, this.fileRelations.length);
    }
}

class SvgRelations {

    /**
     *
     */
    private relations: SwfRelation[];

    /**
     *
     * @param relations
     */
    public constructor(relations: SwfRelation[]) {
        this.relations = relations;
    }

    /**
     *
     * @param taskIndex
     */
    public getTaskIndexCount(taskIndex: number): number {
        return this.relations
            .filter(relation => (relation.index_before_task === taskIndex))
            .length;
    }

    /**
     *
     * @param allLowers
     * @param allUppers
     */
    public setRelation(allLowers: SvgContainer, allUppers: SvgContainer) {
        if (this.relations == null) {
            return;
        }

        this.relations.forEach(relation => {
            const lowers = <SvgLower[]>allLowers.findFromIndex(relation.index_before_task);
            const uppers = <SvgUpper[]>allUppers.findFromIndex(relation.index_after_task);

            if (lowers == null || uppers == null) {
                return;
            }

            lowers.forEach(lower => {
                if (lower.isConnect()) {
                    return;
                }
                uppers.forEach(upper => {
                    lower.connect(upper);
                });
            });
        });
    }

    /**
     *
     * @param upper
     * @param lower
     */
    public createRelation(upper: SvgUpper, lower: SvgLower): SwfRelation {
        if (upper == null || lower == null) {
            return null;
        }
        return new SwfRelation({
            index_before_task: lower.taskIndex(),
            index_after_task: upper.taskIndex()
        });
    }

    /**
     *
     * @param upper
     * @param lower
     */
    public addRelation(upper: SvgUpper, lower: SvgLower) {
        const relation = this.createRelation(upper, lower);
        if (relation == null) {
            return;
        }
        this.deleteRelation(upper, lower);
        this.relations.push(relation);
    }

    /**
     *
     * @param upper
     * @param lower
     */
    public deleteRelation(upper: SvgUpper, lower: SvgLower) {
        const taskRelation = this.createRelation(upper, lower);
        if (taskRelation == null) {
            return;
        }
        for (let index = this.relations.length - 1; index >= 0; index--) {
            if (this.relations[index].toString() === taskRelation.toString()) {
                this.relations.splice(index, 1);
            }
        }
    }

    /**
     *
     */
    public clear() {
        this.relations = [];
    }
}

class SvgBox {
    private draw: svgjs.Doc;

    private group: svgjs.Element;
    private outerFrame: svgjs.Element;
    private innerFrame: svgjs.Element;
    private title: svgjs.Element;
    private inputGroup: svgjs.Element;
    private outputGroup: svgjs.Element;

    private tree: SwfTree;
    private position: Position2D;
    private startX: number;
    private startY: number;
    private width: number;
    private height: number;

    private static opacity = 0.6;
    private static stroke = 2;
    private static titleHeight = 20;

    /**
     *
     * @param draw
     * @param tree
     * @param position
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
     *
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

        this.innerFrame.size(this.width - SvgBox.stroke, bodyHeight);

        return this;
    }

    /**
     *
     * @param mousedown
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
     *
     * @param dblclick
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
     *
     * @param callback
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
     *
     * @param callback
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
     *
     * @param callback
     */
    public onDragend(callback: ((x: number, y: number) => void)): SvgBox {
        this.group.on('dragend', e => {
            e.preventDefault();
            this.group.style('cursor', 'default');
            // this.position.x = Math.max(this.group.x(), 0);
            // this.position.y = Math.max(this.group.y(), 0);
            this.position.x = this.group.x();
            this.position.y = this.group.y();
            this.group.move(this.position.x, this.position.y);
            callback(this.position.x, this.position.y);
        });
        return this;
    }

    /**
     *
     */
    public front(): SvgBox {
        this.group.front();
        return this;
    }

    /**
     *
     */
    public x(): number {
        return this.position.x;
    }

    /**
     *
     */
    public y(): number {
        return this.position.y;
    }

    /**
     *
     * @param x
     * @param y
     */
    public move(x: number, y: number): SvgBox {
        this.position.x = x;
        this.position.y = y;
        this.group.move(x, y);
        return this;
    }

    /**
     *
     */
    public getHeight(): number {
        return this.height;
    }

    /**
     *
     */
    public getWidth(): number {
        return this.width;
    }

    /**
     *
     */
    public select(): SvgBox {
        this.group.opacity(1.0);
        return this;
    }

    /**
     *
     */
    public unselect(): SvgBox {
        this.group.opacity(SvgBox.opacity);
        return this;
    }

    /**
     *
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
     *
     */
    private createInnerFrame(): svgjs.Element {
        this.innerFrame = this.draw
            .rect(0, 0)
            .attr({
                'fill': 'rgb(50, 50, 50)',
                'stroke': config.node_color[this.tree.type.toLowerCase()],
                'stroke-width': SvgBox.stroke
            })
            .move(SvgBox.stroke / 2, SvgBox.titleHeight);
        return this.innerFrame;
    }

    /**
     *
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
     *
     */
    private createOutput(): svgjs.Element {
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
     *
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
     *
     */
    private createConditionFrame(): void {
        if (ClientUtility.checkFileType(this.tree, JsonFileType.Break) || ClientUtility.checkFileType(this.tree, JsonFileType.Condition)) {
            const polygon = this.draw
                .polygon([
                    [this.width - 4, 0],
                    [this.width, 0],
                    [this.width + 16, this.height / 2],
                    [this.width, this.height],
                    [this.width - 4, this.height]
                ])
                .fill(config.node_color[this.tree.type.toLowerCase()]);
            this.group.add(polygon);
        }
    }

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
     *
     * @param index
     */
    public static caclPlugPosY(index: number): number {
        return SvgBox.titleHeight + 5 + index * 25;
    }
}

class SvgNodeUI {

    private box: SvgBox;
    private hasConnectors: SvgContainer = new SvgContainer();
    private hasReceptors: SvgContainer = new SvgContainer();
    private hasUpper: SvgUpper;
    private hasLowers: SvgContainer = new SvgContainer();

    private tree: SwfTree;
    private parent: SwfTree;

    private static draw: svgjs.Doc;
    private static allNodeUI: SvgNodeUI[] = [];
    private static allReceptors: SvgContainer = new SvgContainer();
    private static allConnectors: SvgContainer = new SvgContainer();
    private static allUppers: SvgContainer = new SvgContainer();
    private static allLowers: SvgContainer = new SvgContainer();

    private static selectedReceptor: SvgReceptor;
    private static selectedConnector: SvgConnector;
    private static selectedUpper: SvgUpper;
    private static selectedLower: SvgLower;
    private static selectedNodeUI: SvgNodeUI;

    private static fileRelations: SvgFileRelations = new SvgFileRelations([]);
    private static relations: SvgRelations = new SvgRelations([]);

    /**
     *
     * @param svg
     * @param tree
     */
    private constructor(svg: svgjs.Doc, tree: SwfTree, position: Position2D) {
        this.box = new SvgBox(svg, tree, position);

        this.tree = tree;
        this.parent = tree.getParent();

        this.createConnector();
        this.createReceptor();

        this.createUpper();
        this.createLower();

        this.onDragstart();
        this.onDragmove();
        this.onDragend();
    }

    /**
     *
     */
    private static init(id: string, mousedown: ((child: SwfTree) => void), dblclick: ((child: SwfTree) => void)) {
        this.allConnectors.clear();
        this.allReceptors.clear();
        this.allLowers.clear();
        this.allUppers.clear();

        this.allNodeUI.forEach((node, index) => {
            node.box.delete();
            node.hasConnectors.clear();
            node.hasReceptors.clear();
            node.hasLowers.clear();
            if (node.hasUpper) {
                node.hasUpper.delete();
            }

            node.box = null;
        });
        this.allNodeUI = [];

        if (this.draw == null) {
            this.draw = SVG(id);
            this.draw.on('mousedown', () => {
                this.unselect();
                mousedown(null);
            });
            this.draw.on('dblclick', () => {
                dblclick(null);
            });
        }
    }

    /**
     *
     * @param tree
     * @param mousedown
     * @param dblclick
     * @param isHighlight
     */
    public static create(tree: SwfTree, selectTree: SwfTree, id: string, mousedown: ((child: SwfTree) => void), dblclick: ((child: SwfTree) => void)) {

        this.init(id, mousedown, dblclick);

        this.fileRelations = new SvgFileRelations(tree.file_relations);
        this.relations = new SvgRelations(tree.relations);

        tree.children.forEach((child, index) => {
            const node = new SvgNodeUI(SvgNodeUI.draw, child, tree.positions[index]);
            this.allNodeUI.push(node);

            node.box.onMousedown(mousedown);
            node.box.onDblclick(dblclick);

            if (child === selectTree) {
                node.box.select();
                this.selectedNodeUI = node;
            }
        });

        this.fileRelations.setFileRelation(this.allConnectors, this.allReceptors);
        this.relations.setRelation(this.allLowers, this.allUppers);
    }

    /**
     *
     */
    private static unselect() {
        if (this.selectedNodeUI != null && this.selectedNodeUI.box != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    }

    /**
     *
     */
    private createUpper() {
        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: 0,
            color: config.plug_color.flow,
            taskIndex: this.tree.getTaskIndex()
        };

        const upper = new SvgUpper(plugConfig)
            .onMouseup(() => {
                let lower = SvgNodeUI.selectedLower;
                if (lower != null) {
                    if (this.hasLowers.isExist(lower)) {
                        console.log('not connect to your self');
                        lower = null;
                    }
                    else {
                        SvgNodeUI.selectedUpper = this.hasUpper;
                    }
                }
                SvgNodeUI.selectedLower = null;
            });

        this.hasUpper = upper;
        SvgNodeUI.allUppers.add(upper);
    }

    /**
     *
     */
    private createLower() {
        this.generateLower();
        const count = SvgNodeUI.relations.getTaskIndexCount(this.tree.getTaskIndex());

        for (let c = 0; c < count; c++) {
            this.generateLower();
        }
    }

    /**
     *
     */
    private generateLower(): SvgLower {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight() + 2,
            color: config.plug_color.flow,
            taskIndex: this.tree.getTaskIndex()
        };

        const lower = new SvgLower(plugConfig)
            .onDragstart(() => {
                if (!lower.isConnect()) {
                    const newer = this.generateLower();
                    console.log(`create new lower index=${newer.name()} `);
                }
            })
            .onMousedown((upper: SvgUpper) => {
                const index = lower.name();
                console.log(`has index= ${index} `);
                this.front();
                SvgNodeUI.selectedUpper = null;
                SvgNodeUI.selectedLower = lower;
                SvgNodeUI.allUppers.front();
                SvgNodeUI.relations.deleteRelation(upper, lower);
            })
            .onDragmove(() => {

            })
            .onDragend(() => {
                SvgNodeUI.selectedLower = null;
                let upper = SvgNodeUI.selectedUpper;
                SvgNodeUI.selectedUpper = null;
                this.front();

                if (lower.connect(upper)) {
                    SvgNodeUI.relations.addRelation(upper, lower);
                }
                else {
                    SvgNodeUI.allLowers.remove(lower);
                    this.hasLowers.remove(lower);
                    console.log(`delete lower index=${lower.name()} `);
                }

                SvgNodeUI.allUppers.forEach((upper: SvgUpper) => {
                    upper.frontIfConnectedPlug();
                });

                this.hasReceptors.forEach((receptor: SvgReceptor) => {
                    receptor.frontIfConnectedPlug();
                });
            });

        this.hasLowers.add(lower);
        SvgNodeUI.allLowers.add(lower);
        return lower;
    }

    /**
     *
     */
    private createConnector(): svgjs.Element {
        const group = SvgNodeUI.draw.group();
        this.tree.output_files.forEach((output, index) => {
            const y = SvgBox.caclPlugPosY(index);
            this.generateConnector(output, index);

            const count = SvgNodeUI.fileRelations.count(this.tree.getTaskIndex(), output.path, this.tree.path);
            for (let c = 0; c < count; c++) {
                this.generateConnector(output, index);
            }
        });
        return group;
    }

    /**
     *
     * @param output
     * @param fileIndex
     */
    private generateConnector(output: SwfFile, index: number) {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() - 8,
            offsetY: SvgBox.caclPlugPosY(index),
            color: config.plug_color[output.type],
            file: output,
            tree: this.tree,
            taskIndex: this.tree.getTaskIndex()
        };

        const connector = new SvgConnector(plugConfig)
            .onDragstart(() => {
                if (!connector.isConnect()) {
                    const newer = this.generateConnector(output, index);
                    console.log(`create new connecotr index=${newer.name()} `);
                }
            })
            .onMousedown((receptor: SvgReceptor) => {
                const index = connector.name();
                console.log(`has index= ${index} `);
                SvgNodeUI.selectedReceptor = null;
                SvgNodeUI.selectedConnector = connector;
                this.front();
                SvgNodeUI.allReceptors.forEach((receptor: SvgReceptor) => {
                    receptor.frontIfConnectedPlug();
                });
                SvgNodeUI.fileRelations.deleteFileRelation(connector, receptor);
                this.addParentFile(connector, receptor);
            })
            .onDragmove(() => {

            })
            .onDragend((): void => {
                SvgNodeUI.selectedConnector = null;
                let receptor = SvgNodeUI.selectedReceptor;
                SvgNodeUI.selectedReceptor = null;
                this.front();

                if (connector.connect(receptor)) {
                    SvgNodeUI.fileRelations.addFileRelation(connector, receptor);
                    this.deleteParentFile(connector, receptor);
                }
                else {
                    SvgNodeUI.allConnectors.remove(connector);
                    this.hasConnectors.remove(connector);
                    console.log(`delete connector index=${connector.name()}`);
                }

                this.hasReceptors.forEach((receptor: SvgReceptor) => {
                    receptor.frontIfConnectedPlug();
                });
            });

        this.hasConnectors.add(connector);
        SvgNodeUI.allConnectors.add(connector);
        return connector;
    }

    /**
     *
     */
    private createReceptor(): svgjs.Element {
        const group = SvgNodeUI.draw.group();
        this.tree.input_files.forEach((input, fileIndex) => {

            const plugConfig: PlugConfig = {
                svg: SvgNodeUI.draw,
                originX: this.box.x(),
                originY: this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: config.plug_color[input.type],
                file: input,
                tree: this.tree,
                taskIndex: this.tree.getTaskIndex()
            };

            const receptor = new SvgReceptor(plugConfig)
                .onMouseup(() => {
                    let connector = SvgNodeUI.selectedConnector;
                    if (connector != null) {
                        if (this.hasConnectors.isExist(connector)) {
                            console.log('not connect to your self');
                            connector = null;
                        }
                        else {
                            SvgNodeUI.selectedReceptor = receptor;
                        }
                    }
                    SvgNodeUI.selectedConnector = null;
                });

            this.hasReceptors.add(receptor);
            SvgNodeUI.allReceptors.add(receptor);
        });
        return group
    }


    /**
     *
     * @param connector
     * @param receptor
     */
    private addParentFile(connector: SvgConnector, receptor: SvgReceptor) {
        if (receptor == null) {
            return;
        }
        const filepath = connector.filepathFromTree();
        const count = this.hasConnectors.count((plug: SvgConnector) => {
            return filepath === plug.filepathFromTree() && plug.isConnect();
        });
        if (count === 0) {
            this.parent.addOutputFileToParent(connector.taskIndex(), connector.filepathFromTree());
        }
        this.parent.addInputFileToParent(receptor.taskIndex(), receptor.filepathFromTree());
    }

    /**
     *
     * @param connector
     * @param receptor
     */
    private deleteParentFile(connector: SvgConnector, receptor: SvgReceptor) {
        if (connector != null) {
            const taskIndex = connector.taskIndex();
            const filepath = connector.filepathFromTree();
            const count = this.hasConnectors.count((plug: SvgConnector) => {
                return filepath === plug.filepathFromTree() && plug.isConnect();
            });
            if (count !== 0) {
                this.parent.deleteOutputFileFromParent(taskIndex, filepath);
            }
        }
        if (receptor != null) {
            const taskIndex = receptor.taskIndex();
            const filepath = receptor.filepathFromTree();
            this.parent.deleteInputFileFromParent(taskIndex, filepath);
        }
    }

    /**
     *
     */
    private front(): void {
        this.box.front();
        this.hasUpper.front();
        this.hasLowers.front();
        this.hasReceptors.front();
        this.hasConnectors.front();
    }

    /**
     *
     */
    private onDragstart() {
        this.box.onDragstart(() => {
            SvgNodeUI.unselect();
            SvgNodeUI.selectedNodeUI = this;

            this.front();
            this.hasReceptors.forEach((receptor: SvgReceptor) => {
                receptor.frontIfConnectedPlug();
            });
            this.hasUpper.frontIfConnectedPlug();
        });
    }

    /**
     *
     */
    private onDragmove(): void {
        this.box.onDragmove((x: number, y: number) => {
            this.movePlug(x, y);
        });
    }

    /**
     *
     */
    private onDragend(): void {
        this.box.onDragend((x: number, y: number) => {
            this.fit(x, y);
        });
    }

    /**
     *
     * @param x
     * @param y
     */
    private movePlug(x: number, y: number) {
        this.hasConnectors.forEach((connector: SvgConnector) => {
            connector.moveIfDisconnect(x, y);
        });
        this.hasReceptors.forEach((receptor: SvgReceptor) => {
            receptor.moveIfConnectedPlug(x, y);
        });
        this.hasLowers.forEach((lower: SvgLower) => {
            lower.moveIfDisconnect(x, y);
        });
        if (this.hasUpper) {
            this.hasUpper.moveIfConnectedPlug(x, y);
        }
    }

    /**
     *
     * @param x
     * @param y
     */
    public fit(x: number, y: number) {
        const element = $('#node_svg');
        SvgNodeUI.allNodeUI.forEach(node => {
            const nodeX = node.box.x();
            const nodeY = node.box.y();
            const maxX = element.width() - this.box.getWidth();
            const maxY = element.height() - this.box.getHeight();
            x = Math.max(Math.min(maxX, x), 0);
            y = Math.max(Math.min(maxY, y), 0);
            this.box.move(x, y);
            this.movePlug(x, y);
        });
    }
}


class SvgNodePain {
    private static draw: svgjs.Doc;
    private static svgHeight: number = 0;
    private static svgWidth: number = 0;
    private static pains: SvgNodePain[] = [];
    private static taskIndex: string;
    private static callback: ((tree: SwfTree) => void);
    private triangle: svgjs.Element;
    private text: svgjs.Element;
    private tree: SwfTree;

    /**
     *
     * @param draw
     * @param tree
     */
    private constructor(tree: SwfTree) {
        this.tree = tree;
        this.create();
        this.setEvents();
    }

    /**
     *
     */
    private create() {

        const x = 10 * this.tree.getHierarchy() + 12;
        const y = 20 * this.tree.getAbsoluteIndex() + 15;

        const NORMAL_COLOR = 'white';
        const HIGHLIGHT_COLOR = 'orange';
        const color: string = SvgNodePain.taskIndex === this.tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;

        this.triangle = SvgNodePain.draw
            .polygon([[x - 5, y - 5], [x - 5, y + 5], [x + 2, y]])
            .attr({ fill: color, stroke: 'black' })
            .center(x, y);

        this.text = SvgNodePain.draw
            .text(this.tree.name)
            .font({
                size: 12,
                leading: '1'
            })
            .fill(NORMAL_COLOR)
            .x(x + 10)
            .cy(y);

        SvgNodePain.svgHeight = Math.max(SvgNodePain.svgHeight, y);
        SvgNodePain.svgWidth = Math.max(SvgNodePain.svgWidth, this.text.bbox().width + this.text.x());
    }

    /**
     *
     */
    private setEvents() {
        if (!ClientUtility.isImplimentsWorkflow(this.tree.type)) {
            return;
        }
        this.text.style('cursor', 'pointer');
        this.text.on('mouseover', () => {
            this.text.attr({ 'text-decoration': 'underline' });
        });
        this.text.on('mouseout', () => {
            this.text.attr({ 'text-decoration': 'none' });
        });
        this.text.on('click', () => {
            SvgNodePain.callback(this.tree);
        });
    }

    /**
     *
     */
    private delete() {
        this.text.off('mouseover', null);
        this.text.off('mouseout', null);
        this.text.off('click', null);
        this.text.remove();
        this.triangle.remove();
        this.text = null;
        this.triangle = null;
    }

    /**
     *
     * @param taskIndex
     * @param id
     * @param clicked
     */
    private static init(taskIndex: string, id: string, clicked: ((tree: SwfTree) => void)) {
        this.pains.forEach(pain => {
            pain.delete();
            pain = null;
        });
        this.callback = null;

        if (this.draw == null) {
            this.draw = SVG(id);
        }

        this.pains = [];
        this.svgHeight = 0;
        this.svgWidth = 0;
        this.taskIndex = taskIndex;
        this.callback = clicked;
    }

    /**
     *
     * @param tree
     * @param taskIndex
     * @param id
     * @param clicked
     */
    public static create(tree: SwfTree, taskIndex: string, id: string, clicked: ((tree: SwfTree) => void)) {
        this.init(taskIndex, id, clicked);
        this.createPain(tree);
        this.draw.size(this.svgWidth + 5, this.svgHeight + 10);
    }

    /**
     *
     * @param draw
     * @param tree
     */
    private static createPain(tree: SwfTree) {
        this.pains.push(new SvgNodePain(tree));
        tree.children.forEach(child => {
            this.createPain(child);
        });
    }
}