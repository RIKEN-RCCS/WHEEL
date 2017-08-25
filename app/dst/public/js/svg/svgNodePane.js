/**
 * svg node pane class
 */
var SvgNodePane = (function () {
    /**
     * create new instance
     * @param tree display target tree
     */
    function SvgNodePane(tree) {
        this.tree = tree;
        this.create();
        this.setEvents();
    }
    /**
     * create pane
     */
    SvgNodePane.prototype.create = function () {
        var x = 10 * this.tree.getHierarchy() + 12;
        var y = 20 * this.tree.getUniqueIndex() + 15;
        var NORMAL_COLOR = 'white';
        var HIGHLIGHT_COLOR = 'orange';
        var color = SvgNodePane.taskIndex === this.tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;
        this.triangle = SvgNodePane.draw
            .polygon([[x - 5, y - 5], [x - 5, y + 5], [x + 2, y]])
            .attr({ fill: color, stroke: 'black' })
            .center(x, y);
        this.text = SvgNodePane.draw
            .text(this.tree.name)
            .font({
            size: 12,
            leading: '1'
        })
            .fill(NORMAL_COLOR)
            .x(x + 10)
            .cy(y);
        var textBBox = this.text.bbox();
        SvgNodePane.svgHeight = Math.max(SvgNodePane.svgHeight, textBBox.height + textBBox.y);
        SvgNodePane.svgWidth = Math.max(SvgNodePane.svgWidth, textBBox.width + textBBox.x);
    };
    /**
     * set events
     */
    SvgNodePane.prototype.setEvents = function () {
        var _this = this;
        if (!SwfType.isImplimentsWorkflow(this.tree)) {
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
            SvgNodePane.callback(_this.tree);
        });
    };
    /**
     * delete pane
     */
    SvgNodePane.prototype.delete = function () {
        this.text.off('mouseover', null);
        this.text.off('mouseout', null);
        this.text.off('click', null);
        this.text.remove();
        this.triangle.remove();
        this.text = null;
        this.triangle = null;
    };
    /**
     * initialize
     * @param taskIndex display target task index
     * @param id html id for svg
     * @param callback The function to call when we get text click event
     */
    SvgNodePane.init = function (taskIndex, id, callback) {
        this.panes.forEach(function (pane) {
            pane.delete();
            pane = null;
        });
        this.callback = null;
        if (this.draw == null) {
            this.draw = SVG(id);
        }
        this.panes = [];
        this.svgHeight = 0;
        this.svgWidth = 0;
        this.taskIndex = taskIndex;
        this.callback = callback;
    };
    /**
     * create pane
     * @param root root tree
     * @param taskIndex display target task index
     * @param id html id for svg
     * @param callback The function to call when we get text click event
     */
    SvgNodePane.create = function (root, taskIndex, id, callback) {
        this.init(taskIndex, id, callback);
        this.createPane(root);
        this.draw.size(this.svgWidth, this.svgHeight);
    };
    /**
     * create all pane
     * @param tree tree
     */
    SvgNodePane.createPane = function (tree) {
        var _this = this;
        this.panes.push(new SvgNodePane(tree));
        tree.children.forEach(function (child) { return _this.createPane(child); });
    };
    /**
     * get pane svg width
     * @return pane svg width
     */
    SvgNodePane.getWidth = function () {
        return this.svgWidth;
    };
    /**
     * canvas height
     */
    SvgNodePane.svgHeight = 0;
    /**
     * canvas width
     */
    SvgNodePane.svgWidth = 0;
    /**
     * all panes
     */
    SvgNodePane.panes = [];
    return SvgNodePane;
}());
//# sourceMappingURL=svgNodePane.js.map