/**
 * cable class
 */
class SvgCable {

    /**
     * cable element
     */
    private cable: svgjs.Element;
    /**
     * x coordinate of start point
     */
    private startX: number;
    /**
     * y coordinate of start point
     */
    private startY: number;
    /**
     * x coordinate of end point
     */
    private endX: number;
    /**
     * y coordinate of end point
     */
    private endY: number;
    /**
     * plot cable callback function
     */
    private readonly plotCallback: ((startX: number, startY: number, endX: number, endY: number) => string);

    /**
     * create new instance
     * @param cable cable
     * @param startX start x position
     * @param startY start y position
     * @param plotCallback cable plot callback function
     */
    public constructor(cable: svgjs.Element, startX: number, startY: number, plotCallback) {
        this.plotCallback = plotCallback;
        this.startX = startX;
        this.startY = startY;
        this.cable = cable;
    }

    /**
     * plot cable with specified start point
     * @param x x point
     * @param y y point
     */
    public plotStart(x: number, y: number): void {
        this.startX = x;
        this.startY = y;
        this.plotCable();
    }

    /**
     * plot cable with specified end point
     * @param x x point
     * @param y y point
     */
    public plotEnd(x: number, y: number): void {
        this.endX = x;
        this.endY = y;
        this.plotCable();
    }

    /**
     * plot cable
     */
    private plotCable(): void {
        if (this.endX !== undefined && this.endY !== undefined) {
            const plot: string = this.plotCallback(this.startX, this.startY, this.endX, this.endY);
            this.cable.plot(plot).back();
        }
    }

    /**
     * erase cable
     */
    public erase(): void {
        this.cable.plot('');
        this.endX = undefined;
        this.endY = undefined;
    }

    /**
     * remove cable
     */
    public remove(): void {
        if (this.cable != null) {
            this.cable.remove();
            this.cable = null;
        }
    }
}
