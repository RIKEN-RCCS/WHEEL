/**
 *
 */
var SvgContainer = (function () {
    function SvgContainer() {
        /**
         *
         */
        this.container = {};
    }
    /**
     *
     * @param plug
     */
    SvgContainer.prototype.add = function (plug) {
        var name = plug.name();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    };
    /**
     *
     * @param object
     */
    SvgContainer.prototype.remove = function (object) {
        var name;
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
    };
    /**
     *
     * @param object
     */
    SvgContainer.prototype.isExist = function (object) {
        var name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        return this.container[name] != null;
    };
    /**
     *
     * @param name
     */
    SvgContainer.prototype.find = function (name) {
        return this.container[name];
    };
    /**
     *
     */
    SvgContainer.prototype.front = function () {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            _this.container[key].front();
        });
    };
    /**
     *
     * @param x
     * @param y
     */
    SvgContainer.prototype.move = function (x, y) {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            _this.container[key].move(x, y);
        });
    };
    /**
     *
     * @param callback
     */
    SvgContainer.prototype.forEach = function (callback) {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            callback(_this.container[key]);
        });
    };
    /**
     *
     */
    SvgContainer.prototype.clear = function () {
        var _this = this;
        Object.keys(this.container).forEach(function (key) {
            _this.remove(key);
        });
    };
    /**
     *
     * @param taskIndex
     * @param filepath
     */
    SvgContainer.prototype.findFromIndex = function (taskIndex, filepath) {
        var _this = this;
        return Object.keys(this.container).filter(function (key) {
            var task = _this.container[key].taskIndex();
            if (filepath === undefined) {
                return task == taskIndex;
            }
            else {
                var file = _this.container[key].filepathFromTree();
                return (task == taskIndex && file == filepath);
            }
        }).map(function (key) { return _this.container[key]; });
    };
    /**
     *
     * @param callback
     */
    SvgContainer.prototype.count = function (callback) {
        var _this = this;
        var counter = 0;
        Object.keys(this.container).forEach(function (key) {
            if (callback(_this.container[key])) {
                counter++;
            }
        });
        return counter;
    };
    return SvgContainer;
}());
var SvgFileRelations = (function () {
    /**
     *
     * @param fileRelations
     */
    function SvgFileRelations(fileRelations) {
        this.fileRelations = fileRelations;
    }
    /**
     *
     * @param taskIndex
     * @param filepath
     * @param dirname
     */
    SvgFileRelations.prototype.count = function (taskIndex, filepath, dirname) {
        var filename = taskIndex + "_" + dirname + "/" + ClientUtility.normalize(filepath);
        return this.fileRelations
            .filter(function (relation) { return relation.getOutputFileName() === filename; })
            .length;
    };
    /**
     *
     */
    SvgFileRelations.prototype.setFileRelation = function (allConnectors, allReceptors) {
        var _this = this;
        if (this.fileRelations == null) {
            return;
        }
        var relaltions = JSON.parse(JSON.stringify(this.fileRelations));
        this.clear();
        relaltions.forEach(function (relation) {
            var connectors = allConnectors.findFromIndex(relation.index_before_task, relation.path_output_file);
            var receptors = allReceptors.findFromIndex(relation.index_after_task, relation.path_input_file);
            if (connectors == null || receptors == null) {
                return;
            }
            connectors.forEach(function (connector, index) {
                if (connector.isConnect()) {
                    return;
                }
                receptors.forEach(function (receptor) {
                    if (receptor.isConnect()) {
                        return;
                    }
                    if (!connector.connect(receptor)) {
                        _this.deleteFileRelation(connector, receptor);
                    }
                    else {
                        _this.addFileRelation(connector, receptor);
                    }
                });
            });
        });
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgFileRelations.prototype.createFileRelation = function (connector, receptor) {
        if (connector == null || receptor == null) {
            return null;
        }
        var outputPath = ClientUtility.normalize(connector.parentDirname() + "/" + connector.filepath());
        var inputPath = ClientUtility.normalize(receptor.parentDirname() + "/" + receptor.filepath());
        var relation = {
            index_before_task: connector.taskIndex(),
            path_output_file: "./" + outputPath,
            index_after_task: receptor.taskIndex(),
            path_input_file: "./" + inputPath,
        };
        return new SwfRelationFile(relation);
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgFileRelations.prototype.addFileRelation = function (connector, receptor) {
        var relation = this.createFileRelation(connector, receptor);
        if (relation == null) {
            return;
        }
        this.deleteFileRelation(connector, receptor);
        this.fileRelations.push(relation);
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgFileRelations.prototype.deleteFileRelation = function (connector, receptor) {
        var fileRelation = this.createFileRelation(connector, receptor);
        if (fileRelation == null) {
            return;
        }
        for (var index = this.fileRelations.length - 1; index >= 0; index--) {
            if (this.fileRelations[index].toString() === fileRelation.toString()) {
                this.fileRelations.splice(index, 1);
            }
        }
    };
    /**
     *
     */
    SvgFileRelations.prototype.clear = function () {
        this.fileRelations.splice(0, this.fileRelations.length);
    };
    return SvgFileRelations;
}());
var SvgRelations = (function () {
    /**
     *
     * @param relations
     */
    function SvgRelations(relations) {
        this.relations = relations;
    }
    /**
     *
     * @param taskIndex
     */
    SvgRelations.prototype.getTaskIndexCount = function (taskIndex) {
        return this.relations
            .filter(function (relation) { return (relation.index_before_task === taskIndex); })
            .length;
    };
    /**
     *
     * @param allLowers
     * @param allUppers
     */
    SvgRelations.prototype.setRelation = function (allLowers, allUppers) {
        if (this.relations == null) {
            return;
        }
        this.relations.forEach(function (relation) {
            var lowers = allLowers.findFromIndex(relation.index_before_task);
            var uppers = allUppers.findFromIndex(relation.index_after_task);
            if (lowers == null || uppers == null) {
                return;
            }
            lowers.forEach(function (lower) {
                if (lower.isConnect()) {
                    return;
                }
                uppers.forEach(function (upper) {
                    lower.connect(upper);
                });
            });
        });
    };
    /**
     *
     * @param upper
     * @param lower
     */
    SvgRelations.prototype.createRelation = function (upper, lower) {
        if (upper == null || lower == null) {
            return null;
        }
        return new SwfRelation({
            index_before_task: lower.taskIndex(),
            index_after_task: upper.taskIndex()
        });
    };
    /**
     *
     * @param upper
     * @param lower
     */
    SvgRelations.prototype.addRelation = function (upper, lower) {
        var relation = this.createRelation(upper, lower);
        if (relation == null) {
            return;
        }
        this.deleteRelation(upper, lower);
        this.relations.push(relation);
    };
    /**
     *
     * @param upper
     * @param lower
     */
    SvgRelations.prototype.deleteRelation = function (upper, lower) {
        var taskRelation = this.createRelation(upper, lower);
        if (taskRelation == null) {
            return;
        }
        for (var index = this.relations.length - 1; index >= 0; index--) {
            if (this.relations[index].toString() === taskRelation.toString()) {
                this.relations.splice(index, 1);
            }
        }
    };
    /**
     *
     */
    SvgRelations.prototype.clear = function () {
        this.relations = [];
    };
    return SvgRelations;
}());
var SvgBox = (function () {
    /**
     *
     * @param draw
     * @param tree
     * @param position
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
     *
     */
    SvgBox.prototype.create = function () {
        var input = this.createInput();
        var output = this.createOutput();
        var outputBBox = output.bbox();
        var inputBBox = input.bbox();
        var bodyHeight = 12 + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
        this.height = bodyHeight + SvgBox.titleHeight;
        var title = this.createTitle();
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
    };
    /**
     *
     * @param mousedown
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
     *
     * @param dblclick
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
     *
     * @param callback
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
     *
     * @param callback
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
     *
     * @param callback
     */
    SvgBox.prototype.onDragend = function (callback) {
        var _this = this;
        this.group.on('dragend', function (e) {
            e.preventDefault();
            _this.group.style('cursor', 'default');
            // this.position.x = Math.max(this.group.x(), 0);
            // this.position.y = Math.max(this.group.y(), 0);
            _this.position.x = _this.group.x();
            _this.position.y = _this.group.y();
            _this.group.move(_this.position.x, _this.position.y);
            callback(_this.position.x, _this.position.y);
        });
        return this;
    };
    /**
     *
     */
    SvgBox.prototype.front = function () {
        this.group.front();
        return this;
    };
    /**
     *
     */
    SvgBox.prototype.x = function () {
        return this.position.x;
    };
    /**
     *
     */
    SvgBox.prototype.y = function () {
        return this.position.y;
    };
    /**
     *
     * @param x
     * @param y
     */
    SvgBox.prototype.move = function (x, y) {
        this.position.x = x;
        this.position.y = y;
        this.group.move(x, y);
        return this;
    };
    /**
     *
     */
    SvgBox.prototype.getHeight = function () {
        return this.height;
    };
    /**
     *
     */
    SvgBox.prototype.getWidth = function () {
        return this.width;
    };
    /**
     *
     */
    SvgBox.prototype.select = function () {
        this.group.opacity(1.0);
        return this;
    };
    /**
     *
     */
    SvgBox.prototype.unselect = function () {
        this.group.opacity(SvgBox.opacity);
        return this;
    };
    /**
     *
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
     *
     */
    SvgBox.prototype.createInnerFrame = function () {
        this.innerFrame = this.draw
            .rect(0, 0)
            .attr({
            'fill': 'rgb(50, 50, 50)',
            'stroke': config.node_color[this.tree.type.toLowerCase()],
            'stroke-width': SvgBox.stroke
        })
            .move(SvgBox.stroke / 2, SvgBox.titleHeight);
        return this.innerFrame;
    };
    /**
     *
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
     *
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
     *
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
     *
     */
    SvgBox.prototype.createConditionFrame = function () {
        if (ClientUtility.checkFileType(this.tree, JsonFileType.Break) || ClientUtility.checkFileType(this.tree, JsonFileType.Condition)) {
            var polygon = this.draw
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
    };
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
     *
     * @param index
     */
    SvgBox.caclPlugPosY = function (index) {
        return SvgBox.titleHeight + 5 + index * 25;
    };
    return SvgBox;
}());
SvgBox.opacity = 0.6;
SvgBox.stroke = 2;
SvgBox.titleHeight = 20;
var SvgNodeUI = (function () {
    /**
     *
     * @param svg
     * @param tree
     */
    function SvgNodeUI(svg, tree, position) {
        this.hasConnectors = new SvgContainer();
        this.hasReceptors = new SvgContainer();
        this.hasLowers = new SvgContainer();
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
    SvgNodeUI.init = function (id, mousedown, dblclick) {
        var _this = this;
        this.allConnectors.clear();
        this.allReceptors.clear();
        this.allLowers.clear();
        this.allUppers.clear();
        this.allNodeUI.forEach(function (node, index) {
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
            this.draw.on('mousedown', function () {
                _this.unselect();
                mousedown(null);
            });
            this.draw.on('dblclick', function () {
                dblclick(null);
            });
        }
    };
    /**
     *
     * @param tree
     * @param mousedown
     * @param dblclick
     * @param isHighlight
     */
    SvgNodeUI.create = function (tree, selectTree, id, mousedown, dblclick) {
        var _this = this;
        this.init(id, mousedown, dblclick);
        this.fileRelations = new SvgFileRelations(tree.file_relations);
        this.relations = new SvgRelations(tree.relations);
        tree.children.forEach(function (child, index) {
            var node = new SvgNodeUI(SvgNodeUI.draw, child, tree.positions[index]);
            _this.allNodeUI.push(node);
            node.box.onMousedown(mousedown);
            node.box.onDblclick(dblclick);
            if (child === selectTree) {
                node.box.select();
                _this.selectedNodeUI = node;
            }
        });
        this.fileRelations.setFileRelation(this.allConnectors, this.allReceptors);
        this.relations.setRelation(this.allLowers, this.allUppers);
    };
    /**
     *
     */
    SvgNodeUI.unselect = function () {
        if (this.selectedNodeUI != null && this.selectedNodeUI.box != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    };
    /**
     *
     */
    SvgNodeUI.prototype.createUpper = function () {
        var _this = this;
        var plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: 0,
            color: config.plug_color.flow,
            taskIndex: this.tree.getTaskIndex()
        };
        var upper = new SvgUpper(plugConfig)
            .onMouseup(function () {
            var lower = SvgNodeUI.selectedLower;
            if (lower != null) {
                if (_this.hasLowers.isExist(lower)) {
                    console.log('not connect to your self');
                    lower = null;
                }
                else {
                    SvgNodeUI.selectedUpper = _this.hasUpper;
                }
            }
            SvgNodeUI.selectedLower = null;
        });
        this.hasUpper = upper;
        SvgNodeUI.allUppers.add(upper);
    };
    /**
     *
     */
    SvgNodeUI.prototype.createLower = function () {
        this.generateLower();
        var count = SvgNodeUI.relations.getTaskIndexCount(this.tree.getTaskIndex());
        for (var c = 0; c < count; c++) {
            this.generateLower();
        }
    };
    /**
     *
     */
    SvgNodeUI.prototype.generateLower = function () {
        var _this = this;
        var plugConfig = {
            svg: SvgNodeUI.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight() + 2,
            color: config.plug_color.flow,
            taskIndex: this.tree.getTaskIndex()
        };
        var lower = new SvgLower(plugConfig)
            .onDragstart(function () {
            if (!lower.isConnect()) {
                var newer = _this.generateLower();
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
            SvgNodeUI.selectedLower = null;
            var upper = SvgNodeUI.selectedUpper;
            SvgNodeUI.selectedUpper = null;
            _this.front();
            if (lower.connect(upper)) {
                SvgNodeUI.relations.addRelation(upper, lower);
            }
            else {
                SvgNodeUI.allLowers.remove(lower);
                _this.hasLowers.remove(lower);
                console.log("delete lower index=" + lower.name() + " ");
            }
            SvgNodeUI.allUppers.forEach(function (upper) {
                upper.frontIfConnectedPlug();
            });
            _this.hasReceptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
        });
        this.hasLowers.add(lower);
        SvgNodeUI.allLowers.add(lower);
        return lower;
    };
    /**
     *
     */
    SvgNodeUI.prototype.createConnector = function () {
        var _this = this;
        var group = SvgNodeUI.draw.group();
        this.tree.output_files.forEach(function (output, index) {
            var y = SvgBox.caclPlugPosY(index);
            _this.generateConnector(output, index);
            var count = SvgNodeUI.fileRelations.count(_this.tree.getTaskIndex(), output.path, _this.tree.path);
            for (var c = 0; c < count; c++) {
                _this.generateConnector(output, index);
            }
        });
        return group;
    };
    /**
     *
     * @param output
     * @param fileIndex
     */
    SvgNodeUI.prototype.generateConnector = function (output, index) {
        var _this = this;
        var plugConfig = {
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
        var connector = new SvgConnector(plugConfig)
            .onDragstart(function () {
            if (!connector.isConnect()) {
                var newer = _this.generateConnector(output, index);
                console.log("create new connecotr index=" + newer.name() + " ");
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
            _this.addParentFile(connector, receptor);
        })
            .onDragmove(function () {
        })
            .onDragend(function () {
            SvgNodeUI.selectedConnector = null;
            var receptor = SvgNodeUI.selectedReceptor;
            SvgNodeUI.selectedReceptor = null;
            _this.front();
            if (connector.connect(receptor)) {
                SvgNodeUI.fileRelations.addFileRelation(connector, receptor);
                _this.deleteParentFile(connector, receptor);
            }
            else {
                SvgNodeUI.allConnectors.remove(connector);
                _this.hasConnectors.remove(connector);
                console.log("delete connector index=" + connector.name());
            }
            _this.hasReceptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
        });
        this.hasConnectors.add(connector);
        SvgNodeUI.allConnectors.add(connector);
        return connector;
    };
    /**
     *
     */
    SvgNodeUI.prototype.createReceptor = function () {
        var _this = this;
        var group = SvgNodeUI.draw.group();
        this.tree.input_files.forEach(function (input, fileIndex) {
            var plugConfig = {
                svg: SvgNodeUI.draw,
                originX: _this.box.x(),
                originY: _this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: config.plug_color[input.type],
                file: input,
                tree: _this.tree,
                taskIndex: _this.tree.getTaskIndex()
            };
            var receptor = new SvgReceptor(plugConfig)
                .onMouseup(function () {
                var connector = SvgNodeUI.selectedConnector;
                if (connector != null) {
                    if (_this.hasConnectors.isExist(connector)) {
                        console.log('not connect to your self');
                        connector = null;
                    }
                    else {
                        SvgNodeUI.selectedReceptor = receptor;
                    }
                }
                SvgNodeUI.selectedConnector = null;
            });
            _this.hasReceptors.add(receptor);
            SvgNodeUI.allReceptors.add(receptor);
        });
        return group;
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgNodeUI.prototype.addParentFile = function (connector, receptor) {
        if (receptor == null) {
            return;
        }
        var filepath = connector.filepathFromTree();
        var count = this.hasConnectors.count(function (plug) {
            return filepath === plug.filepathFromTree() && plug.isConnect();
        });
        if (count === 0) {
            this.parent.addOutputFileToParent(connector.taskIndex(), connector.filepathFromTree());
        }
        this.parent.addInputFileToParent(receptor.taskIndex(), receptor.filepathFromTree());
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgNodeUI.prototype.deleteParentFile = function (connector, receptor) {
        if (connector != null) {
            var taskIndex = connector.taskIndex();
            var filepath_1 = connector.filepathFromTree();
            var count = this.hasConnectors.count(function (plug) {
                return filepath_1 === plug.filepathFromTree() && plug.isConnect();
            });
            if (count !== 0) {
                this.parent.deleteOutputFileFromParent(taskIndex, filepath_1);
            }
        }
        if (receptor != null) {
            var taskIndex = receptor.taskIndex();
            var filepath = receptor.filepathFromTree();
            this.parent.deleteInputFileFromParent(taskIndex, filepath);
        }
    };
    /**
     *
     */
    SvgNodeUI.prototype.front = function () {
        this.box.front();
        this.hasUpper.front();
        this.hasLowers.front();
        this.hasReceptors.front();
        this.hasConnectors.front();
    };
    /**
     *
     */
    SvgNodeUI.prototype.onDragstart = function () {
        var _this = this;
        this.box.onDragstart(function () {
            SvgNodeUI.unselect();
            SvgNodeUI.selectedNodeUI = _this;
            _this.front();
            _this.hasReceptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
            _this.hasUpper.frontIfConnectedPlug();
        });
    };
    /**
     *
     */
    SvgNodeUI.prototype.onDragmove = function () {
        var _this = this;
        this.box.onDragmove(function (x, y) {
            _this.movePlug(x, y);
        });
    };
    /**
     *
     */
    SvgNodeUI.prototype.onDragend = function () {
        var _this = this;
        this.box.onDragend(function (x, y) {
            _this.fit(x, y);
        });
    };
    /**
     *
     * @param x
     * @param y
     */
    SvgNodeUI.prototype.movePlug = function (x, y) {
        this.hasConnectors.forEach(function (connector) {
            connector.moveIfDisconnect(x, y);
        });
        this.hasReceptors.forEach(function (receptor) {
            receptor.moveIfConnectedPlug(x, y);
        });
        this.hasLowers.forEach(function (lower) {
            lower.moveIfDisconnect(x, y);
        });
        if (this.hasUpper) {
            this.hasUpper.moveIfConnectedPlug(x, y);
        }
    };
    /**
     *
     * @param x
     * @param y
     */
    SvgNodeUI.prototype.fit = function (x, y) {
        var _this = this;
        var element = $('#node_svg');
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
    return SvgNodeUI;
}());
SvgNodeUI.allNodeUI = [];
SvgNodeUI.allReceptors = new SvgContainer();
SvgNodeUI.allConnectors = new SvgContainer();
SvgNodeUI.allUppers = new SvgContainer();
SvgNodeUI.allLowers = new SvgContainer();
SvgNodeUI.fileRelations = new SvgFileRelations([]);
SvgNodeUI.relations = new SvgRelations([]);
var SvgNodePain = (function () {
    /**
     *
     * @param draw
     * @param tree
     */
    function SvgNodePain(tree) {
        this.tree = tree;
        this.create();
        this.setEvents();
    }
    /**
     *
     */
    SvgNodePain.prototype.create = function () {
        var x = 10 * this.tree.getHierarchy() + 12;
        var y = 20 * this.tree.getAbsoluteIndex() + 15;
        var NORMAL_COLOR = 'white';
        var HIGHLIGHT_COLOR = 'orange';
        var color = SvgNodePain.taskIndex === this.tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;
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
    };
    /**
     *
     */
    SvgNodePain.prototype.setEvents = function () {
        var _this = this;
        if (!ClientUtility.isImplimentsWorkflow(this.tree.type)) {
            return;
        }
        this.text.style('cursor', 'pointer');
        this.text.on('mouseover', function () {
            _this.text.attr({ 'text-decoration': 'underline' });
        });
        this.text.on('mouseout', function () {
            _this.text.attr({ 'text-decoration': 'none' });
        });
        this.text.on('click', function () {
            SvgNodePain.callback(_this.tree);
        });
    };
    /**
     *
     */
    SvgNodePain.prototype.delete = function () {
        this.text.off('mouseover', null);
        this.text.off('mouseout', null);
        this.text.off('click', null);
        this.text.remove();
        this.triangle.remove();
        this.text = null;
        this.triangle = null;
    };
    /**
     *
     * @param taskIndex
     * @param id
     * @param clicked
     */
    SvgNodePain.init = function (taskIndex, id, clicked) {
        this.pains.forEach(function (pain) {
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
    };
    /**
     *
     * @param tree
     * @param taskIndex
     * @param id
     * @param clicked
     */
    SvgNodePain.create = function (tree, taskIndex, id, clicked) {
        this.init(taskIndex, id, clicked);
        this.createPain(tree);
        this.draw.size(this.svgWidth + 5, this.svgHeight + 10);
    };
    /**
     *
     * @param draw
     * @param tree
     */
    SvgNodePain.createPain = function (tree) {
        var _this = this;
        this.pains.push(new SvgNodePain(tree));
        tree.children.forEach(function (child) {
            _this.createPain(child);
        });
    };
    return SvgNodePain;
}());
SvgNodePain.svgHeight = 0;
SvgNodePain.svgWidth = 0;
SvgNodePain.pains = [];
//# sourceMappingURL=svgNodeUI.js.map