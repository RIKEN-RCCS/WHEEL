/**
 * cable class
 */
var SvgCable = (function () {
    /**
     * create new instance
     * @param cable cable
     * @param startX start x position
     * @param startY start y position
     * @param plotCallback cable plot callback function
     */
    function SvgCable(cable, startX, startY, plotCallback) {
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
    SvgCable.prototype.plotStart = function (x, y) {
        this.startX = x;
        this.startY = y;
        this.plotCable();
    };
    /**
     * plot cable with specified end point
     * @param x x point
     * @param y y point
     */
    SvgCable.prototype.plotEnd = function (x, y) {
        this.endX = x;
        this.endY = y;
        this.plotCable();
    };
    /**
     * plot cable
     */
    SvgCable.prototype.plotCable = function () {
        if (this.endX !== undefined && this.endY !== undefined) {
            var plot = this.plotCallback(this.startX, this.startY, this.endX, this.endY);
            this.cable.plot(plot).back();
        }
    };
    /**
     * erase cable
     */
    SvgCable.prototype.erase = function () {
        this.cable.plot('');
        this.endX = undefined;
        this.endY = undefined;
    };
    /**
     * remove cable
     */
    SvgCable.prototype.remove = function () {
        if (this.cable != null) {
            this.cable.remove();
            this.cable = null;
        }
    };
    return SvgCable;
}());
//# sourceMappingURL=svgCable.js.map