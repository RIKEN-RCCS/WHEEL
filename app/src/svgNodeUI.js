import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';

import config from './config';
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
    //this.index=node.index;

    const svgBox = parts.createBox(svg, node.x, node.y, node.type, node.name, node.inputFiles, node.outputFiles);
    this.box = svgBox.box;
    //this.box.data('index', node.index);
    const bbox=this.box.bbox()
    const boxWidth= bbox.width;
    const boxHeight=bbox.height;
    const boxX=this.box.x();
    const boxY=this.box.y();
    const upper = parts.createUpper(svg, boxX, boxY, boxWidth/2, 0);
    const numLower=node.type === 'if'? 3:2;
    const lower = parts.createLower(svg, boxX, boxY, boxWidth/numLower, boxHeight);

    const connectors = parts.createConnectors(node.outputFiles, svg, boxX, boxY, boxWidth, svgBox.textHeight);
    const receptors = parts.createReceptors(node.inputFiles,    svg, boxX, boxY, 0, svgBox.textHeight);

    this.group=this.draw.group();
    this.group.data('index', node.index);
    this.group
      .add(this.box)
      .add(upper.plug)
      .add(lower.plug)
      .add(lower.cable)
      .draggable()
      .on('mousedown', ()=>{
        setSelectedNode(this.index);
      });
    connectors.forEach((connector)=>{
      this.group.add(connector.plug);
      this.group.add(connector.cable);
    });
    receptors.forEach((receptor)=>{
      this.group.add(receptor.plug);
    });
    if(numLower === 3){
      const lower2 = parts.createLower(svg, this.box.x(), this.box.y(), boxWidth/numLower*2, boxHeight);
      this.group.add(lower2.plug).add(lower2.cable);
    }
  }
  /**
   * delete this node
   */
  remove(){
    this.group.remove();
  }
  /**
   * add onClick event listener to box
   */
  onClick(callback){
    this.box.on('click', callback);
  }
}
