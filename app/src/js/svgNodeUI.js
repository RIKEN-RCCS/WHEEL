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
    this.group=svg.group();
    this.group.data({"index": node.index, "type": node.type}).draggable().addClass('node');
    const svgBox = parts.createBox(svg, node.pos.x, node.pos.y, node.type, node.name, node.inputFiles, node.outputFiles);
    const box = svgBox.box;
    const textHeight=svgBox.textHeight;
    let boxBbox=box.bbox()
    const boxX=box.x();
    const boxY=box.y();
    this.group.add(box);
    this.group.data({"boxBbox": boxBbox});

    const upper = parts.createUpper(svg, boxX, boxY, boxBbox.width/2, 0);
    upper.data({"index": node.index});
    this.group.add(upper);

    const numLower=node.type === 'if'? 3:2;
    this.lower = parts.createLower(svg, boxBbox, boxX, boxY, boxBbox.width/numLower, boxBbox.height, config.plug_color.flow, sio);
    this.lower.plug.data({"next": node.next});
    this.group.add(this.lower.plug).add(this.lower.cable.cable);

    this.connectors=[];
    node.outputFiles.forEach((output, fileIndex) => {
      const connector = parts.createConnector(svg, boxX, boxY, boxBbox.width, textHeight*fileIndex, sio);
      connector.plug.data({"name": output.name, "dst": output.dst});
      this.group.add(connector.plug);
      this.group.add(connector.cable.cable);
      this.connectors.push(connector);
    });

    node.inputFiles.forEach((input, fileIndex) => {
      const receptor = parts.createReceptor(svg, boxX, boxY, 0, textHeight*fileIndex);
      receptor.data({"index": node.index, "name": input.name});
      this.group.add(receptor);
    });

    if(numLower === 3){
      this.lower2 = parts.createLower(svg, boxBbox, boxX, boxY, boxBbox.width/numLower*2, boxBbox.height, config.plug_color.elseFlow, sio)
      this.lower2.plug.addClass('elsePlug').data({"else": node.else});
      this.group.add(this.lower2.plug).add(this.lower2.cable.cable);
    }

    if(node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'For' || node.type === 'If' || node.type === 'Foreach'){
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
   * draw cables between Lower-Upper and Connector-Receptor respectively
   */
  drawLinks(){
    let boxBbox=this.group.data('boxBbox');
    let upperPlugs=this.svg.select('.upperPlug');
    let srcPlug=this.lower.plug;
    srcPlug.data('next').forEach((dstIndex)=>{
      let dstPlug = upperPlugs.members.find((plug)=>{
        return plug.data('index') === dstIndex;
      });
      const cable = new parts.SvgCable(this.svg, config.plug_color.flow, 'DU', boxBbox, srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
      cable._draw(cable.startX, cable.startY, cable.endX, cable.endY);
      cable.cable.data('dst', dstIndex);
      this.nextLinks.push(cable);
    });
    if(this.hasOwnProperty('lower2')){
      let srcPlug=this.lower2.plug;
      srcPlug.data('else').forEach((dstIndex)=>{
        let dstPlug = upperPlugs.members.find((plug)=>{
          return plug.data('index') === dstIndex;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.elseFlow, 'DU', boxBbox, srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY);
        cable.cable.data('dst', dstIndex);
        this.elseLinks.push(cable);
      });
    }
    let receptorPlugs=this.svg.select('.receptorPlug');
    this.connectors.forEach((connector)=>{
      let srcPlug = connector.plug;
      srcPlug.data('dst').forEach((dst)=>{
        let dstPlug = receptorPlugs.members.find((plug)=>{
          return plug.data('index') === dst.dstNode;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.file, 'RL', boxBbox, srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY);
        cable.cable.data('dst', dst.dstNode);
        this.outputFileLinks.push(cable);
      });
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
