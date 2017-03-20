/**
 * svg node
 */
class SvgNodeUI {
    /**
     * svg box
     */
    private box: SvgBox;
    /**
     * has outout file plugs
     */
    private hasConnectors: SvgContainer = new SvgContainer();
    /**
     * has input file plugs
     */
    private hasReceptors: SvgContainer = new SvgContainer();
    /**
     * has before task plug
     */
    private hasUpper: SvgUpper;
    /**
     * has after task plug
     */
    private hasLowers: SvgContainer = new SvgContainer();
    /**
     * display target tree
     */
    private tree: SwfTree;
    /**
     * parent of display target tree
     */
    private parent: SwfTree;
    /**
     * draw canvas
     */
    private static draw: svgjs.Doc;
    /**
     * html id of svg canvas
     */
    private static id: string;
    /**
     * all nodes
     */
    private static allNodeUI: SvgNodeUI[] = [];
    /**
     * all outout file plugs
     */
    private static allConnectors: SvgContainer = new SvgContainer();
    /**
     * all input file plugs
     */
    private static allReceptors: SvgContainer = new SvgContainer();
    /**
     * all before task plugs
     */
    private static allUppers: SvgContainer = new SvgContainer();
    /**
     * all next task plugs
     */
    private static allLowers: SvgContainer = new SvgContainer();
    /**
     * selected input file plug for connect
     */
    private static selectedReceptor: SvgReceptor;
    /**
     * selected output file plug for connect
     */
    private static selectedConnector: SvgConnector;
    /**
     * selected before task plug for connect
     */
    private static selectedUpper: SvgUpper;
    /**
     * selected after task plug for connect
     */
    private static selectedLower: SvgLower;
    /**
     * selected node
     */
    private static selectedNodeUI: SvgNodeUI;
    /**
     * file relations
     */
    private static fileRelations: SvgFileRelations = new SvgFileRelations([]);
    /**
     * task relations
     */
    private static relations: SvgRelations = new SvgRelations([]);

    /**
     * create new instance
     * @param svg draw canvas
     * @param tree target display tree
     * @param position display position
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
     * initialize node
     * @param id html id of draw canvas
     * @param mousedown The function to call when we get the mousedown event
     * @param dblclick The function to call when we get the double click event
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
            this.id = id;
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
     * create node
     * @param parent create node tree parent
     * @param selectTree selected child tree
     * @param id html id of draw canvas
     * @param mousedown The function to call when we get the mousedown event
     * @param dblclick The function to call when we get the double click event
     */
    public static create(parent: SwfTree, selectTree: SwfTree, id: string, mousedown: ((child: SwfTree) => void), dblclick: ((child: SwfTree) => void)) {

        this.init(id, mousedown, dblclick);

        this.fileRelations = new SvgFileRelations(parent.file_relations);
        this.relations = new SvgRelations(parent.relations);

        parent.children.forEach((child, index) => {
            const node = new SvgNodeUI(SvgNodeUI.draw, child, parent.positions[index]);
            this.allNodeUI.push(node);

            node.box.onMousedown(mousedown);
            node.box.onDblclick(dblclick);

            if (child === selectTree) {
                node.box.select();
                this.selectedNodeUI = node;
            }
        });

        this.fileRelations.initFileRelation(this.allConnectors, this.allReceptors);
        this.relations.initRelation(this.allLowers, this.allUppers);
    }

    /**
     * unselect
     */
    private static unselect() {
        if (this.selectedNodeUI != null && this.selectedNodeUI.box != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    }

    /**
     * create before task plug
     */
    private createUpper() {
        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: 0,
            color: config.plug_color.flow,
            tree: this.tree
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
     * create after task plug
     */
    private createLower() {
        this.generateNewLower();
        const count = SvgNodeUI.relations.getTaskIndexCount(this.tree.getTaskIndex());

        for (let c = 0; c < count; c++) {
            this.generateNewLower();
        }
    }

    /**
     * generate new after task plug
     */
    private generateNewLower(): SvgLower {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight() + 2,
            color: config.plug_color.flow,
            tree: this.tree
        };

        const lower = new SvgLower(plugConfig)
            .onDragstart(() => {
                if (!lower.isConnect()) {
                    const newer = this.generateNewLower();
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

                if (lower.connect(upper, false)) {
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
     * create output file plug
     */
    private createConnector() {
        if (ClientUtility.checkFileType(this.tree, JsonFileType.Condition)) {
            return;
        }
        this.tree.output_files.forEach((output, index) => {
            const y = SvgBox.caclPlugPosY(index);
            this.generateNewConnector(output, index);

            const count = SvgNodeUI.fileRelations.count(this.tree.getTaskIndex(), output.path, this.tree.path);
            for (let c = 0; c < count; c++) {
                this.generateNewConnector(output, index);
            }
        });
    }

    /**
     * generate new output file plug
     * @param output target file
     * @param index file index
     */
    private generateNewConnector(output: SwfFile, index: number) {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() - 8,
            offsetY: SvgBox.caclPlugPosY(index),
            color: config.plug_color[output.type],
            file: output,
            tree: this.tree
        };

        const connector = new SvgConnector(plugConfig)
            .onDragstart(() => {
                if (!connector.isConnect()) {
                    const newer = this.generateNewConnector(output, index);
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
                this.addParentFileRelation(connector, receptor);
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
                    this.deleteParentFileRelation(connector, receptor);
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
     * create input file plug
     */
    private createReceptor() {
        this.tree.input_files.forEach((input, fileIndex) => {

            const plugConfig: PlugConfig = {
                svg: SvgNodeUI.draw,
                originX: this.box.x(),
                originY: this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: config.plug_color[input.type],
                file: input,
                tree: this.tree
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
    }

    /**
     * add file relation to parent
     * @param connector output file plug
     * @param receptor input file plug
     */
    private addParentFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        if (receptor == null) {
            return;
        }
        const filepath = connector.getFilepathFromTree();
        const count = this.hasConnectors.count((plug: SvgConnector) => {
            return filepath === plug.getFilepathFromTree() && plug.isConnect();
        });
        if (count === 0) {
            this.parent.addOutputFileToParent(connector.getTaskIndex(), connector.getFilepathFromTree());
        }
        this.parent.addInputFileToParent(receptor.getTaskIndex(), receptor.getFilepathFromTree());
    }

    /**
     * delete file relation from parent
     * @param connector output file plug
     * @param receptor input file plug
     */
    private deleteParentFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        if (connector != null) {
            const taskIndex = connector.getTaskIndex();
            const filepath = connector.getFilepathFromTree();
            const count = this.hasConnectors.count((plug: SvgConnector) => {
                return filepath === plug.getFilepathFromTree() && plug.isConnect();
            });
            if (count !== 0) {
                this.parent.deleteOutputFileFromParent(taskIndex, filepath);
            }
        }
        if (receptor != null) {
            const taskIndex = receptor.getTaskIndex();
            const filepath = receptor.getFilepathFromTree();
            this.parent.deleteInputFileFromParent(taskIndex, filepath);
        }
    }

    /**
     * move to front
     */
    private front() {
        this.box.front();
        this.hasUpper.front();
        this.hasLowers.front();
        this.hasReceptors.front();
        this.hasConnectors.front();
    }

    /**
     * Adds a listener for dragstart event
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
     * Adds a listener for dragmove event
     */
    private onDragmove(): void {
        this.box.onDragmove((x: number, y: number) => {
            this.movePlug(x, y);
        });
    }

    /**
     * Adds a listener for dragend event
     */
    private onDragend(): void {
        this.box.onDragend((x: number, y: number) => {
            this.fit(x, y);
        });
    }

    /**
     * move plug
     * @param x x potision
     * @param y y position
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
     * move to web browser area
     * @param x x position
     * @param y y position
     */
    public fit(x: number, y: number) {
        const element = $(`#${SvgNodeUI.id}`);
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