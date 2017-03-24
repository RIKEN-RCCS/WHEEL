/**
 * svg node pane class
 */
class SvgNodePane {
    /**
     * draw canvas
     */
    private static draw: svgjs.Doc;
    /**
     * canvas height
     */
    private static svgHeight: number = 0;
    /**
     * canvas width
     */
    private static svgWidth: number = 0;
    /**
     * all panes
     */
    private static panes: SvgNodePane[] = [];
    /**
     * selected task index
     */
    private static taskIndex: string;
    /**
     * callback function
     */
    private static callback: ((tree: SwfTree) => void);
    /**
     * triangle marker
     */
    private triangle: svgjs.Element;
    /**
     * text
     */
    private text: svgjs.Element;
    /**
     * display target tree
     */
    private tree: SwfTree;

    /**
     * create new instance
     * @param tree display target tree
     */
    private constructor(tree: SwfTree) {
        this.tree = tree;
        this.create();
        this.setEvents();
    }

    /**
     * create pane
     */
    private create() {

        const x = 10 * this.tree.getHierarchy() + 12;
        const y = 20 * this.tree.getUniqueIndex() + 15;

        const NORMAL_COLOR = 'white';
        const HIGHLIGHT_COLOR = 'orange';
        const color: string = SvgNodePane.taskIndex === this.tree.getIndexString() ? HIGHLIGHT_COLOR : NORMAL_COLOR;

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

        SvgNodePane.svgHeight = Math.max(SvgNodePane.svgHeight, y);
        SvgNodePane.svgWidth = Math.max(SvgNodePane.svgWidth, this.text.bbox().width + this.text.x());
    }

    /**
     * set events
     */
    private setEvents() {
        if (!ClientUtility.isImplimentsWorkflow(this.tree)) {
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
     * initialize
     * @param taskIndex display target task index
     * @param id html id for svg
     * @param callback The function to call when we get text click event
     */
    private static init(taskIndex: string, id: string, callback: ((tree: SwfTree) => void)) {
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
    public static create(root: SwfTree, taskIndex: string, id: string, callback: ((tree: SwfTree) => void)) {
        this.init(taskIndex, id, callback);
        this.createPane(root);
        this.draw.size(this.svgWidth + 5, this.svgHeight + 10);
    }

    /**
     * create all pane
     * @param tree tree
     */
    private static createPane(tree: SwfTree) {
        this.panes.push(new SvgNodePane(tree));
        tree.children.forEach(child => this.createPane(child));
    }
}