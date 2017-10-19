import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';

import * as parts from './svgParts';

/**
 * svg node
 */
export default class{
  /**
   * create new instance
   * @param svg draw canvas
   * @param node any node instance to draw
   */
  constructor(svg, node, setSelectedNode) {
    /** svg.js's instance*/
    this.draw=svg;
    this.index=node.index;

    this.box = parts.createBox(svg, node.x, node.y, node.type, node.name, node.inputFiles, node.outputFiles);
    this.box.data('index', node.index);
    const bbox=this.box.bbox()
    const boxWidth= bbox.width;
    const boxHeight=bbox.height;
    const upper = parts.createUpper(svg, this.box.x(), this.box.y(), boxWidth/2, 0);
    const numLower=node.type === 'if'? 3:2;
    const lower = parts.createLower(svg, this.box.x(), this.box.y(), boxWidth/numLower, boxHeight);
    // add plugs
    //this.createConnector(node.outputFiles);
    //this.recepter = this.createReceptor(node.inputFiles);

    this.group=this.draw.group();
    this.group.data('index', node.index);
    this.group
      .add(this.box)
      .add(upper)
      .add(lower.plug)
      .add(lower.cable)
      .draggable()
      .on('mousedown', ()=>{
        setSelectedNode(this.index);
      });
    if(numLower === 3){
      const lower2 = parts.createLower(svg, this.box.x(), this.box.y(), boxWidth/numLower*2, boxHeight);
      this.group.add(lower2.plug).add(lower2.cable);
    }
  }
  remove(){
    this.group.remove();
  }
  onClick(callback){
    this.box.on('click', callback);
  }
}
