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
    private connectors: SvgContainer = new SvgContainer();
    /**
     * has input file plugs
     */
    private receptors: SvgContainer = new SvgContainer();
    /**
     * has before task plug
     */
    private upper: SvgUpper;
    /**
     * has after task plug
     */
    private lowers: SvgContainer = new SvgContainer();
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

        this.setDragstartEvent();
        this.setDragmoveEvent();
        this.setDragendEvent();
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
            node.connectors.clear();
            node.receptors.clear();
            node.lowers.clear();
            if (node.upper) {
                node.upper.delete();
            }

            node.box = null;
        });
        this.allNodeUI = [];

        if (this.draw == null) {
            this.id = id;
            this.draw = SVG(id);
            this.draw.size(4096, 2048);
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
            node.fit(node.box.x(), node.box.y());

            if (child === selectTree) {
                node.box.select();
                this.selectedNodeUI = node;
            }
        });

        this.fileRelations.initFileRelation(this.allConnectors, this.allReceptors);
        this.relations.initRelation(this.allLowers, this.allUppers);

        this.allNodeUI.forEach(node => {
            node.fit(node.box.x(), node.box.y());
        });
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
        if (ClientUtility.checkFileType(this.tree.type, JsonFileType.Condition)) {
            return;
        }

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
                if (SvgNodeUI.selectedLower != null) {
                    SvgNodeUI.selectedUpper = upper;
                }
            });

        this.upper = upper;
        SvgNodeUI.allUppers.add(upper);
    }

    /**
     * create after task plug
     */
    private createLower() {
        if (ClientUtility.checkFileType(this.tree.type, JsonFileType.Condition)) {
            return;
        }

        this.generateNewLower();
        const count = SvgNodeUI.relations.getTaskIndexCount(this.tree.getTaskIndex());

        for (let c = 0; c < count; c++) {
            this.generateNewLower();
        }
    }

    /**
     * generate new after task plug
     * @return generate new SvgLower instance
     */
    private generateNewLower(): SvgLower {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight(),
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
                const upper = SvgNodeUI.selectedUpper;
                const lower = SvgNodeUI.selectedLower;
                SvgNodeUI.selectedUpper = null;
                SvgNodeUI.selectedLower = null;

                if (lower == null) {
                    return;
                }

                if (lower.connect(upper, false)) {
                    SvgNodeUI.relations.addRelation(upper, lower);
                }
                else {
                    SvgNodeUI.allLowers.remove(lower);
                    this.lowers.remove(lower);
                    console.log(`delete lower index=${lower.name()} `);
                }

                SvgNodeUI.allUppers.forEach((upper: SvgUpper) => {
                    upper.frontIfConnectedPlug();
                });

                this.receptors.forEach((receptor: SvgReceptor) => {
                    receptor.frontIfConnectedPlug();
                });
            });

        this.lowers.add(lower);
        SvgNodeUI.allLowers.add(lower);
        return lower;
    }

    /**
     * create output file plug
     */
    private createConnector() {
        if (ClientUtility.isImplimentsCondition(this.tree)) {
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
     * @return generete new SvgConnector instance
     */
    private generateNewConnector(output: SwfFile, index: number): SvgConnector {

        const plugConfig: PlugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() + SvgBox.getOutputTextOffset(),
            offsetY: SvgBox.caclPlugPosY(index),
            color: config.plug_color[output.type],
            file: output,
            tree: this.tree
        };

        const connector = new SvgConnector(plugConfig)
            .onDragstart(() => {
                if (!connector.isConnect()) {
                    const newer = this.generateNewConnector(output, index);
                    console.log(`create new connecotr index=${newer.name()}`);
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
                this.addFileRelationToParent(connector, receptor);
            })
            .onDragmove(() => {

            })
            .onDragend((): void => {
                const connector = SvgNodeUI.selectedConnector;
                const receptor = SvgNodeUI.selectedReceptor;
                SvgNodeUI.selectedReceptor = null;
                SvgNodeUI.selectedConnector = null;

                if (connector == null) {
                    return;
                }

                if (connector.connect(receptor)) {
                    SvgNodeUI.fileRelations.addFileRelation(connector, receptor);
                    this.deleteFileRelationFromParent(connector, receptor);
                }
                else {
                    SvgNodeUI.allConnectors.remove(connector);
                    this.connectors.remove(connector);
                    console.log(`delete connector index=${connector.name()}`);
                }

                this.receptors.forEach((receptor: SvgReceptor) => {
                    receptor.frontIfConnectedPlug();
                });
            });

        this.connectors.add(connector);
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
                    if (SvgNodeUI.selectedConnector != null) {
                        SvgNodeUI.selectedReceptor = receptor;
                    }
                });

            this.receptors.add(receptor);
            SvgNodeUI.allReceptors.add(receptor);
        });
    }

    /**
     * add file relation to parent
     * @param connector output file plug
     * @param receptor input file plug
     */
    private addFileRelationToParent(connector: SvgConnector, receptor: SvgReceptor) {
        if (receptor == null) {
            return;
        }
        const filepath = connector.getFilepathFromTree();
        const count = this.connectors.count((plug: SvgConnector) => {
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
    private deleteFileRelationFromParent(connector: SvgConnector, receptor: SvgReceptor) {
        if (connector != null) {
            const taskIndex = connector.getTaskIndex();
            const filepath = connector.getFilepathFromTree();
            const count = this.connectors.count((plug: SvgConnector) => {
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
        this.lowers.front();
        this.receptors.front();
        this.connectors.front();
        if (this.upper != null) {
            this.upper.front();
        }
    }

    /**
     * Adds a listener for dragstart event
     */
    private setDragstartEvent() {
        this.box.onDragstart(() => {
            SvgNodeUI.unselect();
            SvgNodeUI.selectedNodeUI = this;

            this.front();
            this.receptors.forEach((receptor: SvgReceptor) => {
                receptor.frontIfConnectedPlug();
            });
            if (this.upper != null) {
                this.upper.frontIfConnectedPlug();
            }
        });
    }

    /**
     * Adds a listener for dragmove event
     */
    private setDragmoveEvent(): void {
        this.box.onDragmove((x: number, y: number) => {
            this.movePlug(x, y);
        });
    }

    /**
     * Adds a listener for dragend event
     */
    private setDragendEvent(): void {
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
        this.connectors.forEach((connector: SvgConnector) => {
            connector.moveIfDisconnect(x, y);
        });
        this.receptors.forEach((receptor: SvgReceptor) => {
            receptor.moveIfConnectedPlug(x, y);
        });
        this.lowers.forEach((lower: SvgLower) => {
            lower.moveIfDisconnect(x, y);
        });
        if (this.upper) {
            this.upper.moveIfConnectedPlug(x, y);
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