/**
 * svg node
 */
class SvgNodeUI {
    /**
     * create new instance
     * @param svg draw canvas
     * @param tree target display tree
     * @param position display position
     */
    constructor(svg, tree, position) {
        /**
         * has outout file plugs
         */
        this.connectors = new SvgContainer();
        /**
         * has input file plugs
         */
        this.receptors = new SvgContainer();
        /**
         * has after task plug
         */
        this.lowers = new SvgContainer();
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
    static init(id, mousedown, dblclick) {
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
            this.draw.on('mousedown', (e) => {
                const key = e.button;
                if (key === MouseKeyType.LEFT) {
                    this.unselect();
                    mousedown(null);
                }
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
    static create(parent, selectTree, id, mousedown, dblclick) {
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
        this.allNodeUI.forEach(node => {
            node.fit(node.box.x(), node.box.y());
        });
    }
    /**
     * unselect
     */
    static unselect() {
        if (this.selectedNodeUI != null && this.selectedNodeUI.box != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    }
    /**
     * create before task plug
     */
    createUpper() {
        if (SwfType.isCondition(this.tree)) {
            return;
        }
        const plugConfig = {
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
    createLower() {
        if (this.tree.type === SwfType.CONDITION) {
            return;
        }
        this.generateNewLower();
        const count = SvgNodeUI.relations.getMatchedCount(this.tree.getHashCode());
        for (let c = 0; c < count; c++) {
            this.generateNewLower();
        }
    }
    /**
     * generate new after task plug
     * @return generate new SvgLower instance
     */
    generateNewLower() {
        const plugConfig = {
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
            .onMousedown((upper) => {
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
            SvgNodeUI.allUppers.forEach((upper) => {
                upper.frontIfConnectedPlug();
            });
            this.receptors.forEach((receptor) => {
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
    createConnector() {
        if (SwfType.isImplimentsCondition(this.tree)) {
            return;
        }
        this.tree.output_files.forEach((output, index) => {
            const y = SvgBox.caclPlugPosY(index);
            this.generateNewConnector(output, index);
            const count = SvgNodeUI.fileRelations.getMatchedCount(this.tree.getHashCode(), output.path, this.tree.path);
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
    generateNewConnector(output, index) {
        const plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() + SvgBox.getOutputTextOffset(),
            offsetY: SvgBox.caclPlugPosY(index),
            color: SwfFileType.getPlugColor(output),
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
            .onMousedown((receptor) => {
            const index = connector.name();
            console.log(`has index= ${index} `);
            SvgNodeUI.selectedReceptor = null;
            SvgNodeUI.selectedConnector = connector;
            this.front();
            SvgNodeUI.allReceptors.forEach((receptor) => {
                receptor.frontIfConnectedPlug();
            });
            SvgNodeUI.fileRelations.deleteFileRelation(connector, receptor);
            this.addFileRelationToParent(connector, receptor);
        })
            .onDragmove(() => {
        })
            .onDragend(() => {
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
            this.receptors.forEach((receptor) => {
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
    createReceptor() {
        this.tree.input_files.forEach((input, fileIndex) => {
            const plugConfig = {
                svg: SvgNodeUI.draw,
                originX: this.box.x(),
                originY: this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: SwfFileType.getPlugColor(input),
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
    addFileRelationToParent(connector, receptor) {
        if (receptor == null) {
            return;
        }
        const filepath = connector.getFilepathFromTree();
        const count = this.connectors.count((plug) => {
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
    deleteFileRelationFromParent(connector, receptor) {
        if (connector != null) {
            const taskIndex = connector.getTaskIndex();
            const filepath = connector.getFilepathFromTree();
            const count = this.connectors.count((plug) => {
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
    front() {
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
    setDragstartEvent() {
        this.box.onDragstart(() => {
            SvgNodeUI.unselect();
            SvgNodeUI.selectedNodeUI = this;
            this.front();
            this.receptors.forEach((receptor) => {
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
    setDragmoveEvent() {
        this.box.onDragmove((x, y) => {
            this.movePlug(x, y);
        });
    }
    /**
     * Adds a listener for dragend event
     */
    setDragendEvent() {
        this.box.onDragend((x, y) => {
            this.fit(x, y);
        });
    }
    /**
     * move plug
     * @param x x potision
     * @param y y position
     */
    movePlug(x, y) {
        this.connectors.forEach((connector) => {
            connector.moveIfDisconnect(x, y);
        });
        this.receptors.forEach((receptor) => {
            receptor.moveIfConnectedPlug(x, y);
        });
        this.lowers.forEach((lower) => {
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
    fit(x, y) {
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
/**
 * all nodes
 */
SvgNodeUI.allNodeUI = [];
/**
 * all outout file plugs
 */
SvgNodeUI.allConnectors = new SvgContainer();
/**
 * all input file plugs
 */
SvgNodeUI.allReceptors = new SvgContainer();
/**
 * all before task plugs
 */
SvgNodeUI.allUppers = new SvgContainer();
/**
 * all next task plugs
 */
SvgNodeUI.allLowers = new SvgContainer();
/**
 * file relations
 */
SvgNodeUI.fileRelations = new SvgFileRelations([]);
/**
 * task relations
 */
SvgNodeUI.relations = new SvgRelations([]);
//# sourceMappingURL=svgNodeUI.js.map