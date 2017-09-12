/**
 * cable class
 */
class SvgCable {
    /**
     * create new instance
     * @param cable cable
     * @param startX start x position
     * @param startY start y position
     * @param plotCallback cable plot callback function
     */
    constructor(cable, startX, startY, plotCallback) {
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
    plotStart(x, y) {
        this.startX = x;
        this.startY = y;
        this.plotCable();
    }
    /**
     * plot cable with specified end point
     * @param x x point
     * @param y y point
     */
    plotEnd(x, y) {
        this.endX = x;
        this.endY = y;
        this.plotCable();
    }
    /**
     * plot cable
     */
    plotCable() {
        if (this.endX !== undefined && this.endY !== undefined) {
            const plot = this.plotCallback(this.startX, this.startY, this.endX, this.endY);
            this.cable.plot(plot).back();
        }
    }
    /**
     * erase cable
     */
    erase() {
        this.cable.plot('');
        this.endX = undefined;
        this.endY = undefined;
    }
    /**
     * remove cable
     */
    remove() {
        if (this.cable != null) {
            this.cable.remove();
            this.cable = null;
        }
    }
}
//# sourceMappingURL=svgCable.js.map