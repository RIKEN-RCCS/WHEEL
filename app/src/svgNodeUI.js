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

    /** cable instance container */
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
    this.lower = parts.createLower(svg, boxX, boxY, boxWidth/numLower, boxHeight, config.plug_color.flow, createLink);

    this.connectors = parts.createConnectors(node.outputFiles, svg, boxX, boxY, boxWidth, textHeight, createFileLink);
    const receptors = parts.createReceptors(node.inputFiles,    svg, boxX, boxY, 0, textHeight);

    this.group=this.draw.group();
    this.group.data({'index': node.index});
    this.group
      .add(box)
      .add(upper.plug)
      .add(this.lower.plug)
      .add(this.lower.cable.cable)
      .draggable()
      .addClass('node');
    this.connectors.forEach((connector)=>{
      this.group.add(connector.plug);
      this.group.add(connector.cable.cable);
    });
    receptors.forEach((receptor)=>{
      this.group.add(receptor.plug);
    });
    if(numLower === 3){
      this.lower2 = parts.createLower(svg, boxX, boxY, boxWidth/numLower*2, boxHeight, config.plug_color.elseFlow, createLink);
      this.lower2.plug.addClass('elsePlug')
      this.group.add(this.lower2.plug).add(this.lower2.cable.cable);
    }
  }

  /**
   * helper function of drawLinks
   */
  createLinkedCable(svg, srcPlug, color, counterpart, isThis){
    let dstPlug=null;
    svg.select(counterpart).each(function(i, v){
      if(isThis(this.parent().node.instance, this.node.instance)){
        dstPlug= this;
        return false;
      }
    });
    const [sx, sy] = parts.calcCenter(srcPlug.node.points);
    const [ex, ey] = parts.calcCenter(dstPlug.node.points);
    const cable = new parts.SvgCable(svg, color, sx, sy, ex, ey);
    return cable;
  }

  /**
   * draw cables between Lower-Upper and Connector-Receptor respectively
   */
  drawLinks(svg, node){
    node.next.forEach((v)=>{
      const cable = this.createLinkedCable(svg, this.lower.plug, config.plug_color.flow, '.upperPlug', function(parent){
        return parent.data('index') === v;
      });
      cable.cable.data('dst', v);
      this.nextLinks.push(cable);
    });
    if(node.type === 'if'){
      node.else.forEach((v)=>{
        const cable = this.createLinkedCable(svg, this.lower2.plug, config.plug_color.elseFlow, '.upperPlug', function(parent){
          return parent.data('index') === v;
        });
        cable.cable.data('dst', v);
        this.elseLinks.push(cable);
      });
    }
    //TODO fix me!  1つのconnectorから複数のreceptorへlinkされてるパターンを確認
    this.connectors.find((connector)=>{
      let dstNode=connector.plug.data('dstNode');
      let dstName=connector.plug.data('dstName');
      // svg.jsのdata()でnullをsetしてからgetするとundefinedが返ってくるので !== ではなく != で判定する必要がある
      if(dstNode != null && dstName != null){
        const cable = this.createLinkedCable(svg, connector.plug, config.plug_color.file, '.receptorPlug', function(parent, dst){
          return parent.data('index') === dstNode && dst.data('name') === dstName;
        });
        cable.cable.data({'dst': dstNode, 'dstName': dstName});
        this.outputFileLinks.push(cable);
      }
    });
  }
  /**
   * redraw cables between Lower-Upper and Connector-Receptor respectively
   * @param offsetX x coordinate difference from dragstart
   * @param offsetY y coordinate difference from dragstart
   */
  reDrawLinks(svg, node, offsetX, offsetY){
    this.nextLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY);
    });
    this.elseLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY);
    });
    this.outputFileLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY);
    });
    this.previousLinks.forEach((v)=>{
      v.dragEndPoint(offsetX, offsetY);
    });
    this.inputFileLinks.forEach((v)=>{
      v.dragEndPoint(offsetX, offsetY);
    });
  }

  /**
   * delete svg of this node
   */
  remove(){
    this.group.remove();
    this.nextLinks.forEach((v)=>{
      v.cable.remove();
    });
    this.elseLinks.forEach((v)=>{
      v.cable.remove();
    });
    this.outputFileLinks.forEach((v)=>{
      v.cable.remove();
    });
    this.previousLinks.forEach((v)=>{
      v.cable.remove();
    });
    this.inputFileLinks.forEach((v)=>{
      v.cable.remove();
    });
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
