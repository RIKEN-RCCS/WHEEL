/**
 * svg node pane class
 */
class SvgNodePane {
    /**
     * create new instance
     * @param tree display target tree
     */
    constructor(tree) {
        this.tree = tree;
        this.create();
        this.setEvents();
    }
    /**
     * create pane
     */
    create() {
        const x = 10 * this.tree.getHierarchy() + 12;
        const y = 20 * this.tree.getUniqueIndex() + 15;
        const NORMAL_COLOR = 'white';
        const HIGHLIGHT_COLOR = 'orange';
        const color = SvgNodePane.taskIndex === this.tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;
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
        const textBBox = this.text.bbox();
        SvgNodePane.svgHeight = Math.max(SvgNodePane.svgHeight, textBBox.height + textBBox.y);
        SvgNodePane.svgWidth = Math.max(SvgNodePane.svgWidth, textBBox.width + textBBox.x);
    }
    /**
     * set events
     */
    setEvents() {
        if (!SwfType.isImplimentsWorkflow(this.tree)) {
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
            SvgNodePane.callback(this.tree);
        });
    }
    /**
     * delete pane
     */
    delete() {
        this.text.off('mouseover', null);
        this.text.off('mouseout', null);
        this.text.off('click', null);
        this.text.remove();
        this.triangle.remove();
        this.text = null;
        this.triangle = null;
    }
    /**
     * initialize
     * @param taskIndex display target task index
     * @param id html id for svg
     * @param callback The function to call when we get text click event
     */
    static init(taskIndex, id, callback) {
        this.panes.forEach(pane => {
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
    }
    /**
     * create pane
     * @param root root tree
     * @param taskIndex display target task index
     * @param id html id for svg
     * @param callback The function to call when we get text click event
     */
    static create(root, taskIndex, id, callback) {
        this.init(taskIndex, id, callback);
        this.createPane(root);
        this.draw.size(this.svgWidth, this.svgHeight);
    }
    /**
     * create all pane
     * @param tree tree
     */
    static createPane(tree) {
        this.panes.push(new SvgNodePane(tree));
        tree.children.forEach(child => this.createPane(child));
    }
    /**
     * get pane svg width
     * @return pane svg width
     */
    static getWidth() {
        return this.svgWidth;
    }
}
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
//# sourceMappingURL=svgNodePane.js.map