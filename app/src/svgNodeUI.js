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
  constructor(svg, node, createLink, createFileLink) {
    /** svg.js's instance*/
    this.draw=svg;

    /** cable instance collection */
    this.nextLinks=[];
    this.elseLinks=[];
    this.previousLinks=[];
    this.outputFileLinks=[];
    this.inputFileLinks=[];

    // draw node
    const svgBox = parts.createBox(svg, node.pos.x, node.pos.y, node.type, node.name, node.inputFiles, node.outputFiles);
    const box = svgBox.box;
    const textHeight=svgBox.textHeight;
    const bbox=box.bbox()
    const boxWidth= bbox.width;
    const boxHeight=bbox.height;
    const boxX=box.x();
    const boxY=box.y();
    const upper = parts.createUpper(svg, boxX, boxY, boxWidth/2, 0);
    const numLower=node.type === 'if'? 3:2;
    const lower = parts.createLower(svg, boxX, boxY, boxWidth/numLower, boxHeight, config.plug_color.flow, createLink);

    const connectors = parts.createConnectors(node.outputFiles, svg, boxX, boxY, boxWidth, textHeight, createFileLink);
    const receptors = parts.createReceptors(node.inputFiles,    svg, boxX, boxY, 0, textHeight);

    this.group=this.draw.group();
    this.group.data({'index': node.index});
    this.group
      .add(box)
      .add(upper.plug)
      .add(lower.plug)
      .add(lower.cable)
      .draggable()
      .addClass('node');
    connectors.forEach((connector)=>{
      this.group.add(connector.plug);
      this.group.add(connector.cable);
    });
    receptors.forEach((receptor)=>{
      this.group.add(receptor.plug);
    });
    if(numLower === 3){
      const lower2 = parts.createLower(svg, boxX, boxY, boxWidth/numLower*2, boxHeight, config.plug_color.elseFlow, createLink);
      lower2.plug.addClass('elsePlug')
      this.group.add(lower2.plug).add(lower2.cable);
    }
  }
  /**
   * delete svg of this node
   */
  remove(){
    this.group.remove();
  }
  /**
   * add onClick event listener to this node
   */
  onMousedown(callback){
    this.group.on('mousedown', callback);
    return this;
  }
  /**
   * add dragstart event listener to this node
   */
  onDragstart(callback){
    this.group.on('dragstart', callback);
    return this;
  }
  /**
   * add dragmove event listener to this node
   */
  onDragmove(callback){
    this.group.on('dragmove', callback);
    return this;
  }
  /**
   * add dragend event listener to this node
   */
  onDragend(callback){
    this.group.on('dragend', callback);
    return this;
  }
}
