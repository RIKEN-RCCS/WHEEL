/**
 * svg node
 */
var SvgNodeUI = (function () {
    /**
     * create new instance
     * @param svg draw canvas
     * @param tree target display tree
     * @param position display position
     */
    function SvgNodeUI(svg, tree, position) {
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
    SvgNodeUI.init = function (id, mousedown, dblclick) {
        var _this = this;
        this.allConnectors.clear();
        this.allReceptors.clear();
        this.allLowers.clear();
        this.allUppers.clear();
        this.allNodeUI.forEach(function (node, index) {
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
            this.draw.on('mousedown', function (e) {
                var key = e.button;
                if (key === MouseKeyType.LEFT) {
                    _this.unselect();
                    mousedown(null);
                }
            });
            this.draw.on('dblclick', function () {
                dblclick(null);
            });
        }
    };
    /**
     * create node
     * @param parent create node tree parent
     * @param selectTree selected child tree
     * @param id html id of draw canvas
     * @param mousedown The function to call when we get the mousedown event
     * @param dblclick The function to call when we get the double click event
     */
    SvgNodeUI.create = function (parent, selectTree, id, mousedown, dblclick) {
        var _this = this;
        this.init(id, mousedown, dblclick);
        this.fileRelations = new SvgFileRelations(parent.file_relations);
        this.relations = new SvgRelations(parent.relations);
        parent.children.forEach(function (child, index) {
            var node = new SvgNodeUI(SvgNodeUI.draw, child, parent.positions[index]);
            _this.allNodeUI.push(node);
            node.box.onMousedown(mousedown);
            node.box.onDblclick(dblclick);
            if (child === selectTree) {
                node.box.select();
                _this.selectedNodeUI = node;
            }
        });
        this.fileRelations.initFileRelation(this.allConnectors, this.allReceptors);
        this.relations.initRelation(this.allLowers, this.allUppers);
        this.allNodeUI.forEach(function (node) {
            node.fit(node.box.x(), node.box.y());
        });
    };
    /**
     * unselect
     */
    SvgNodeUI.unselect = function () {
        if (this.selectedNodeUI != null && this.selectedNodeUI.box != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    };
    /**
     * create before task plug
     */
    SvgNodeUI.prototype.createUpper = function () {
        if (SwfType.isCondition(this.tree)) {
            return;
        }
        var plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: 0,
            color: config.plug_color.flow,
            tree: this.tree
        };
        var upper = new SvgUpper(plugConfig)
            .onMouseup(function () {
            if (SvgNodeUI.selectedLower != null) {
                SvgNodeUI.selectedUpper = upper;
            }
        });
        this.upper = upper;
        SvgNodeUI.allUppers.add(upper);
    };
    /**
     * create after task plug
     */
    SvgNodeUI.prototype.createLower = function () {
        if (this.tree.type === SwfType.CONDITION) {
            return;
        }
        this.generateNewLower();
        var count = SvgNodeUI.relations.getMatchedCount(this.tree.getHashCode());
        for (var c = 0; c < count; c++) {
            this.generateNewLower();
        }
    };
    /**
     * generate new after task plug
     * @return generate new SvgLower instance
     */
    SvgNodeUI.prototype.generateNewLower = function () {
        var _this = this;
        var plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight(),
            color: config.plug_color.flow,
            tree: this.tree
        };
        var lower = new SvgLower(plugConfig)
            .onDragstart(function () {
            if (!lower.isConnect()) {
                var newer = _this.generateNewLower();
                console.log("create new lower index=" + newer.name() + " ");
            }
        })
            .onMousedown(function (upper) {
            var index = lower.name();
            console.log("has index= " + index + " ");
            _this.front();
            SvgNodeUI.selectedUpper = null;
            SvgNodeUI.selectedLower = lower;
            SvgNodeUI.allUppers.front();
            SvgNodeUI.relations.deleteRelation(upper, lower);
        })
            .onDragmove(function () {
        })
            .onDragend(function () {
            var upper = SvgNodeUI.selectedUpper;
            var lower = SvgNodeUI.selectedLower;
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
                _this.lowers.remove(lower);
                console.log("delete lower index=" + lower.name() + " ");
            }
            SvgNodeUI.allUppers.forEach(function (upper) {
                upper.frontIfConnectedPlug();
            });
            _this.receptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
        });
        this.lowers.add(lower);
        SvgNodeUI.allLowers.add(lower);
        return lower;
    };
    /**
     * create output file plug
     */
    SvgNodeUI.prototype.createConnector = function () {
        var _this = this;
        if (SwfType.isImplimentsCondition(this.tree)) {
            return;
        }
        this.tree.output_files.forEach(function (output, index) {
            var y = SvgBox.caclPlugPosY(index);
            _this.generateNewConnector(output, index);
            var count = SvgNodeUI.fileRelations.getMatchedCount(_this.tree.getHashCode(), output.path, _this.tree.path);
            for (var c = 0; c < count; c++) {
                _this.generateNewConnector(output, index);
            }
        });
    };
    /**
     * generate new output file plug
     * @param output target file
     * @param index file index
     * @return generete new SvgConnector instance
     */
    SvgNodeUI.prototype.generateNewConnector = function (output, index) {
        var _this = this;
        var plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() + SvgBox.getOutputTextOffset(),
            offsetY: SvgBox.caclPlugPosY(index),
            color: SwfFileType.getPlugColor(output),
            file: output,
            tree: this.tree
        };
        var connector = new SvgConnector(plugConfig)
            .onDragstart(function () {
            if (!connector.isConnect()) {
                var newer = _this.generateNewConnector(output, index);
                console.log("create new connecotr index=" + newer.name());
            }
        })
            .onMousedown(function (receptor) {
            var index = connector.name();
            console.log("has index= " + index + " ");
            SvgNodeUI.selectedReceptor = null;
            SvgNodeUI.selectedConnector = connector;
            _this.front();
            SvgNodeUI.allReceptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
            SvgNodeUI.fileRelations.deleteFileRelation(connector, receptor);
            _this.addFileRelationToParent(connector, receptor);
        })
            .onDragmove(function () {
        })
            .onDragend(function () {
            var connector = SvgNodeUI.selectedConnector;
            var receptor = SvgNodeUI.selectedReceptor;
            SvgNodeUI.selectedReceptor = null;
            SvgNodeUI.selectedConnector = null;
            if (connector == null) {
                return;
            }
            if (connector.connect(receptor)) {
                SvgNodeUI.fileRelations.addFileRelation(connector, receptor);
                _this.deleteFileRelationFromParent(connector, receptor);
            }
            else {
                SvgNodeUI.allConnectors.remove(connector);
                _this.connectors.remove(connector);
                console.log("delete connector index=" + connector.name());
            }
            _this.receptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
        });
        this.connectors.add(connector);
        SvgNodeUI.allConnectors.add(connector);
        return connector;
    };
    /**
     * create input file plug
     */
    SvgNodeUI.prototype.createReceptor = function () {
        var _this = this;
        this.tree.input_files.forEach(function (input, fileIndex) {
            var plugConfig = {
                svg: SvgNodeUI.draw,
                originX: _this.box.x(),
                originY: _this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: SwfFileType.getPlugColor(input),
                file: input,
                tree: _this.tree
            };
            var receptor = new SvgReceptor(plugConfig)
                .onMouseup(function () {
                if (SvgNodeUI.selectedConnector != null) {
                    SvgNodeUI.selectedReceptor = receptor;
                }
            });
            _this.receptors.add(receptor);
            SvgNodeUI.allReceptors.add(receptor);
        });
    };
    /**
     * add file relation to parent
     * @param connector output file plug
     * @param receptor input file plug
     */
    SvgNodeUI.prototype.addFileRelationToParent = function (connector, receptor) {
        if (receptor == null) {
            return;
        }
        var filepath = connector.getFilepathFromTree();
        var count = this.connectors.count(function (plug) {
            return filepath === plug.getFilepathFromTree() && plug.isConnect();
        });
        if (count === 0) {
            this.parent.addOutputFileToParent(connector.getTaskIndex(), connector.getFilepathFromTree());
        }
        this.parent.addInputFileToParent(receptor.getTaskIndex(), receptor.getFilepathFromTree());
    };
    /**
     * delete file relation from parent
     * @param connector output file plug
     * @param receptor input file plug
     */
    SvgNodeUI.prototype.deleteFileRelationFromParent = function (connector, receptor) {
        if (connector != null) {
            var taskIndex = connector.getTaskIndex();
            var filepath_1 = connector.getFilepathFromTree();
            var count = this.connectors.count(function (plug) {
                return filepath_1 === plug.getFilepathFromTree() && plug.isConnect();
            });
            if (count !== 0) {
                this.parent.deleteOutputFileFromParent(taskIndex, filepath_1);
            }
        }
        if (receptor != null) {
            var taskIndex = receptor.getTaskIndex();
            var filepath = receptor.getFilepathFromTree();
            this.parent.deleteInputFileFromParent(taskIndex, filepath);
        }
    };
    /**
     * move to front
     */
    SvgNodeUI.prototype.front = function () {
        this.box.front();
        this.lowers.front();
        this.receptors.front();
        this.connectors.front();
        if (this.upper != null) {
            this.upper.front();
        }
    };
    /**
     * Adds a listener for dragstart event
     */
    SvgNodeUI.prototype.setDragstartEvent = function () {
        var _this = this;
        this.box.onDragstart(function () {
            SvgNodeUI.unselect();
            SvgNodeUI.selectedNodeUI = _this;
            _this.front();
            _this.receptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
            if (_this.upper != null) {
                _this.upper.frontIfConnectedPlug();
            }
        });
    };
    /**
     * Adds a listener for dragmove event
     */
    SvgNodeUI.prototype.setDragmoveEvent = function () {
        var _this = this;
        this.box.onDragmove(function (x, y) {
            _this.movePlug(x, y);
        });
    };
    /**
     * Adds a listener for dragend event
     */
    SvgNodeUI.prototype.setDragendEvent = function () {
        var _this = this;
        this.box.onDragend(function (x, y) {
            _this.fit(x, y);
        });
    };
    /**
     * move plug
     * @param x x potision
     * @param y y position
     */
    SvgNodeUI.prototype.movePlug = function (x, y) {
        this.connectors.forEach(function (connector) {
            connector.moveIfDisconnect(x, y);
        });
        this.receptors.forEach(function (receptor) {
            receptor.moveIfConnectedPlug(x, y);
        });
        this.lowers.forEach(function (lower) {
            lower.moveIfDisconnect(x, y);
        });
        if (this.upper) {
            this.upper.moveIfConnectedPlug(x, y);
        }
    };
    /**
     * move to web browser area
     * @param x x position
     * @param y y position
     */
    SvgNodeUI.prototype.fit = function (x, y) {
        var _this = this;
        var element = $("#" + SvgNodeUI.id);
        SvgNodeUI.allNodeUI.forEach(function (node) {
            var nodeX = node.box.x();
            var nodeY = node.box.y();
            var maxX = element.width() - _this.box.getWidth();
            var maxY = element.height() - _this.box.getHeight();
            x = Math.max(Math.min(maxX, x), 0);
            y = Math.max(Math.min(maxY, y), 0);
            _this.box.move(x, y);
            _this.movePlug(x, y);
        });
    };
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
    return SvgNodeUI;
}());
//# sourceMappingURL=svgNodeUI.js.map