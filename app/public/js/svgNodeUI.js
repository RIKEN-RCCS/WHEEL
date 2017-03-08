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
        var name = plug.getName();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    };
    /**
     *
     * @param object
     */
    SvgContainer.prototype.delete = function (object) {
        var name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.getName();
        }
        this.container[name].remove();
        this.container[name] = null;
        delete this.container[name];
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
            name = object.getName();
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
            _this.delete(key);
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
            var task = _this.container[key].getTaskIndex();
            if (filepath === undefined) {
                return task == taskIndex;
            }
            else {
                var file = _this.container[key].getFilepath();
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
     * @param relationFiles
     */
    function SvgFileRelations(relationFiles) {
        this.relationFiles = relationFiles;
    }
    /**
     *
     * @param taskIndex
     * @param filepath
     */
    SvgFileRelations.prototype.count = function (taskIndex, filepath) {
        return this.relationFiles
            .filter(function (relation) { return relation.getOutputFileName() === taskIndex + "_" + filepath; })
            .length;
    };
    /**
     *
     */
    SvgFileRelations.prototype.setFileRelation = function (allConnectors, allReceptors) {
        var _this = this;
        if (this.relationFiles == null) {
            return;
        }
        var relaltions = JSON.parse(JSON.stringify(this.relationFiles));
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
        var relation = {
            index_before_task: connector.getTaskIndex(),
            path_output_file: connector.getFilepath(),
            index_after_task: receptor.getTaskIndex(),
            path_input_file: receptor.getFilepath()
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
        this.relationFiles.push(relation);
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgFileRelations.prototype.deleteFileRelation = function (connector, receptor) {
        var _this = this;
        var fileRelation = this.createFileRelation(connector, receptor);
        if (fileRelation == null) {
            return;
        }
        this.relationFiles.forEach(function (relation, index) {
            if (relation.toString() === fileRelation.toString()) {
                _this.relationFiles.splice(index, 1);
            }
        });
    };
    /**
     *
     */
    SvgFileRelations.prototype.clear = function () {
        this.relationFiles.length = 0;
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
            index_before_task: lower.getTaskIndex(),
            index_after_task: upper.getTaskIndex()
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
        var _this = this;
        var taskRelation = this.createRelation(upper, lower);
        if (taskRelation == null) {
            return;
        }
        this.relations.forEach(function (relation, index) {
            if (relation.toString() === taskRelation.toString()) {
                _this.relations.splice(index, 1);
            }
        });
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
        this.tree = tree;
        this.position = position;
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
            .move(this.position.x, this.position.y)
            .add(input)
            .add(output)
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
            callback();
        });
        return this;
    };
    /**
     *
     * @param dblclick
     */
    SvgBox.prototype.onDblclick = function (callback) {
        this.dblclickCallback = callback;
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
        var clicked = false;
        this.group.on('dragend', function (e) {
            e.preventDefault();
            _this.group.style('cursor', 'default');
            _this.position.x = Math.max(_this.group.x(), 0);
            _this.position.y = Math.max(_this.group.y(), 0);
            _this.group.move(_this.position.x, _this.position.y);
            callback(_this.position.x, _this.position.y);
            if (!clicked) {
                clicked = true;
                setTimeout(function () { return clicked = false; }, 500);
            }
            else {
                clicked = false;
                if (_this.dblclickCallback) {
                    _this.dblclickCallback();
                }
            }
        });
        return this;
    };
    /**
     *
     * @param element
     */
    SvgBox.prototype.add = function (element) {
        this.group.add(element);
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
        var group = this.draw.group();
        this.tree.output_files.forEach(function (output, index) {
            var y = SvgBox.caclPlugPosY(index);
            var text = _this.draw
                .text(output.name)
                .fill('white')
                .y(y);
            text.x(-text.bbox().width);
            group.add(text);
        });
        return group;
    };
    /**
     *
     */
    SvgBox.prototype.createInput = function () {
        var _this = this;
        var group = this.draw.group();
        this.tree.input_files.forEach(function (input, index) {
            var y = SvgBox.caclPlugPosY(index);
            var text = _this.draw
                .text(input.name)
                .fill('white')
                .move(12, y);
            group.add(text);
        });
        return group;
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
        this.draw = svg;
        this.box = new SvgBox(svg, tree, position);
        this.tree = tree;
        this.parent = tree.getParent();
        this.create();
    }
    /**
     *
     */
    SvgNodeUI.initNodeUI = function () {
        this.allConnectors.clear();
        this.allReceptors.clear();
        this.allLowers.clear();
        this.allUppers.clear();
    };
    /**
     *
     * @param svg
     * @param tree
     * @param mousedown
     * @param dblclick
     * @param isHighlight
     */
    SvgNodeUI.create = function (svg, tree, highLightTree, mousedown, dblclick) {
        var _this = this;
        this.initNodeUI();
        this.relationFiles = new SvgFileRelations(tree.file_relations);
        this.relations = new SvgRelations(tree.relations);
        tree.children.forEach(function (child, index) {
            var node = new SvgNodeUI(svg, child, tree.positions[index]);
            node.box.onMousedown(function () {
                mousedown(child);
            });
            node.box.onDblclick(function () {
                dblclick(child);
            });
            if (highLightTree === child) {
                node.box.select();
                _this.selectedNodeUI = node;
            }
        });
        this.relationFiles.setFileRelation(this.allConnectors, this.allReceptors);
        this.relations.setRelation(this.allLowers, this.allUppers);
        svg.off('mousedown', null);
        svg.off('dblclick', null);
        svg.on('mousedown', function () {
            _this.unselect();
            mousedown(null);
        });
        svg.on('dblclick', function () {
            var grand = tree.getParent();
            dblclick(grand);
        });
        return this;
    };
    /**
     *
     */
    SvgNodeUI.unselect = function () {
        if (this.selectedNodeUI != null) {
            this.selectedNodeUI.box.unselect();
        }
        this.selectedNodeUI = null;
    };
    /**
     *
     */
    SvgNodeUI.prototype.create = function () {
        this.box
            .create()
            .add(this.createConnector())
            .add(this.createReceptor());
        this.createUpper();
        this.createLower();
        this.onDragstart();
        this.onDragmove();
        this.onDragend();
    };
    /**
     *
     */
    SvgNodeUI.prototype.createUpper = function () {
        var _this = this;
        var plugConfig = {
            svg: this.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: -2,
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
            svg: this.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() / 2,
            offsetY: this.box.getHeight(),
            color: config.plug_color.flow,
            taskIndex: this.tree.getTaskIndex()
        };
        var lower = new SvgLower(plugConfig)
            .onDragstart(function () {
            if (!lower.isConnect()) {
                var newer = _this.generateLower();
                console.log("create new lower index=" + newer.getName() + " ");
            }
        })
            .onMousedown(function (upper) {
            var index = lower.getName();
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
                SvgNodeUI.allLowers.delete(lower);
                _this.hasLowers.delete(lower);
                console.log("delete lower index=" + lower.getName() + " ");
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
        var group = this.draw.group();
        this.tree.output_files.forEach(function (output, index) {
            var y = SvgBox.caclPlugPosY(index);
            _this.generateConnector(output, index);
            var count = SvgNodeUI.relationFiles.count(_this.tree.getTaskIndex(), output.path);
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
            svg: this.draw,
            originX: this.box.x(),
            originY: this.box.y(),
            offsetX: this.box.getWidth() - 8,
            offsetY: SvgBox.caclPlugPosY(index),
            color: config.plug_color[output.type],
            file: output,
            taskIndex: this.tree.getTaskIndex()
        };
        var connector = new SvgConnector(plugConfig)
            .onDragstart(function () {
            if (!connector.isConnect()) {
                var newer = _this.generateConnector(output, index);
                console.log("create new connecotr index=" + newer.getName() + " ");
            }
        })
            .onMousedown(function (receptor) {
            var index = connector.getName();
            console.log("has index= " + index + " ");
            SvgNodeUI.selectedReceptor = null;
            SvgNodeUI.selectedConnector = connector;
            _this.front();
            SvgNodeUI.allReceptors.forEach(function (receptor) {
                receptor.frontIfConnectedPlug();
            });
            SvgNodeUI.relationFiles.deleteFileRelation(connector, receptor);
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
                SvgNodeUI.relationFiles.addFileRelation(connector, receptor);
                _this.deleteParentFile(connector, receptor);
            }
            else {
                SvgNodeUI.allConnectors.delete(connector);
                _this.hasConnectors.delete(connector);
                console.log("delete connector index=" + connector.getName());
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
        var group = this.draw.group();
        this.tree.input_files.forEach(function (input, fileIndex) {
            var plugConfig = {
                svg: _this.draw,
                originX: _this.box.x(),
                originY: _this.box.y(),
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                color: config.plug_color[input.type],
                file: input,
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
        var filepath = connector.getFilepath();
        var count = this.hasConnectors.count(function (plug) {
            return filepath === plug.getFilepath() && plug.isConnect();
        });
        if (count === 0) {
            this.parent.addOutputFileToParent(connector.getTaskIndex(), connector.getFilepath());
        }
        this.parent.addInputFileToParent(receptor.getTaskIndex(), receptor.getFilepath());
    };
    /**
     *
     * @param connector
     * @param receptor
     */
    SvgNodeUI.prototype.deleteParentFile = function (connector, receptor) {
        if (connector != null) {
            var taskIndex = connector.getTaskIndex();
            var filepath_1 = connector.getFilepath();
            var count = this.hasConnectors.count(function (plug) {
                return filepath_1 === plug.getFilepath() && plug.isConnect();
            });
            if (count !== 0) {
                this.parent.deleteOutputFileFromParent(taskIndex, filepath_1);
            }
        }
        if (receptor != null) {
            var taskIndex = receptor.getTaskIndex();
            var filepath = receptor.getFilepath();
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
            _this.movePlug(x, y);
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
        this.hasUpper.moveIfConnectedPlug(x, y);
    };
    return SvgNodeUI;
}());
SvgNodeUI.allReceptors = new SvgContainer();
SvgNodeUI.allConnectors = new SvgContainer();
SvgNodeUI.allUppers = new SvgContainer();
SvgNodeUI.allLowers = new SvgContainer();
//# sourceMappingURL=svgNodeUI.js.map