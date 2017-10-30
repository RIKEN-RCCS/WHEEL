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
   * @param svg  svg.js's instance
   * @param sio  socket.io's instance
   * @param node any node instance to draw
   */
  constructor(svg, sio, node) {
    /** svg.js's instance*/
    this.svg=svg;

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
    this.boxBbox=box.bbox()
    const boxX=box.x();
    const boxY=box.y();
    const upper = parts.createUpper(svg, boxX, boxY, this.boxBbox.width/2, 0);
    const numLower=node.type === 'if'? 3:2;
    this.lower = parts.createLower(svg, this.boxBbox, boxX, boxY, this.boxBbox.width/numLower, this.boxBbox.height, config.plug_color.flow, sio);

    this.connectors = parts.createConnectors(node.outputFiles, svg, boxX, boxY, this.boxBbox.width, textHeight, sio);
    const receptors = parts.createReceptors(node.inputFiles,   svg, boxX, boxY, 0, textHeight);

    this.group=svg.group();
    this.group.data({"index": node.index, "type": node.type});
    this.group
      .add(box)
      .add(upper)
      .add(this.lower.plug)
      .add(this.lower.cable.cable)
      .draggable()
      .addClass('node');
    this.connectors.forEach((connector)=>{
      this.group.add(connector.plug);
      this.group.add(connector.cable.cable);
    });
    receptors.forEach((receptor)=>{
      this.group.add(receptor);
    });
    if(numLower === 3){
      this.lower2 = parts.createLower(svg, this.boxBbox, boxX, boxY, this.boxBbox.width/numLower*2, this.boxBbox.height, config.plug_color.elseFlow, sio);
      this.lower2.plug.addClass('elsePlug')
      this.group.add(this.lower2.plug).add(this.lower2.cable.cable);
    }
    if(node.type == 'workflow' || node.type == 'parameterStudy'){
      this.group.data({"path": node.path, "jsonFile": node.jsonFile});
    }

    // difference between box origin and mouse pointer
    let diffX=0;
    let diffY=0;
    // mouse pointer coordinate on dragstart
    let startX=0;
    let startY=0;
    this.group
      .on('dragstart',(e)=>{
        diffX=e.detail.p.x - e.target.instance.select('.box').first().x();
        diffY=e.detail.p.y - e.target.instance.select('.box').first().y()
        startX = e.detail.p.x;
        startY = e.detail.p.y;
      })
      .on('dragmove', (e)=>{
        let dx = e.detail.p.x - startX;
        let dy = e.detail.p.y - startY;
        this.reDrawLinks(dx, dy)
      })
      .on('dragend', (e)=>{
        let x = e.detail.p.x;
        let y = e.detail.p.y;
        if(x !== startX || y !== startY){
          sio.emit('updateNode', {index: node.index, property: 'pos', value: {'x': x-diffX, 'y': y-diffY}, cmd: 'update'});
        }
      });
  }

  /**
   * helper function of drawLinks
   */
  createLinkedCable(srcPlug, color, counterpart, isThis){
    let dstPlug=null;
    this.svg.select(counterpart).each(function(i, v){
      if(isThis(this.parent().node.instance, this.node.instance)){
        dstPlug= this;
        return false;
      }
    });
    const direction = counterpart === '.upperPlug'? 'DU':'RL';
    const cable = new parts.SvgCable(this.svg, color, direction, this.boxBbox, srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
    cable._draw(cable.startX, cable.startY, cable.endX, cable.endY);
    return cable;
  }

  /**
   * draw cables between Lower-Upper and Connector-Receptor respectively
   */
  drawLinks(node){
    node.next.forEach((v)=>{
      const cable = this.createLinkedCable(this.lower.plug, config.plug_color.flow, '.upperPlug', function(parent){
        return parent.data('index') === v;
      });
      cable.cable.data('dst', v);
      this.nextLinks.push(cable);
    });
    if(node.type === 'if'){
      node.else.forEach((v)=>{
        const cable = this.createLinkedCable(this.lower2.plug, config.plug_color.elseFlow, '.upperPlug', function(parent){
          return parent.data('index') === v;
        });
        cable.cable.data('dst', v);
        this.elseLinks.push(cable);
      });
    }
    //TODO fix me!  1つのconnectorから複数のreceptorへlinkされてるパターンに対応
    this.connectors.find((connector)=>{
      let dstNode=connector.plug.data('dstNode');
      let dstName=connector.plug.data('dstName');
      // svg.jsのdata()でnullをsetしてからgetするとundefinedが返ってくるので !== ではなく != で判定する必要がある
      if(dstNode != null && dstName != null){
        const cable = this.createLinkedCable(connector.plug, config.plug_color.file, '.receptorPlug', function(parent, dst){
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
  reDrawLinks(offsetX, offsetY){
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
   * delete svg element of this node
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
   * register callback function to 'mousedown' event
   */
  onMousedown(callback){
    this.group.on('mousedown', callback);
    return this;
  }

  /**
   * register callback function to 'dblclick' event
   */
  onDblclick(callback){
    this.group.on('dblclick', callback);
    return this;
  }
}
