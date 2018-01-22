import SVG from 'svgjs/dist/svg.js';
import 'svg.draggable.js/dist/svg.draggable.js';
import '../css/workflow.css';

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

    /** svg representation of this node */
    this.group=svg.group();
    this.group.data({"index": node.index, "type": node.type}).draggable().addClass('node');

    // draw node
    const [box, textHeight]= parts.createBox(svg, node.pos.x, node.pos.y, node.type, node.name, node.inputFiles, node.outputFiles, node.state, node.nodes, node.numTotal, node.numFinished, node.numFailed); 
    console.log(node.numFinished);     
    const boxBbox=box.bbox();
    const boxX=box.x();
    const boxY=box.y();
    this.group.add(box);
    this.group.data({"boxBbox": boxBbox});

/*     console.log(node.name);
    //test Children view
    if(node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach'){   
      console.log("createChildrenViewBox");      
      const [viewBox, viewHeight]= parts.createChildrenViewBox(svg, node.pos.x, node.pos.y, node.type, node.name, node.parent, node.jsonFile, node.inputFiles, sio);
      const viewBbox=viewBox.bbox();
      this.group.add(viewBox);
      this.group.data({"viewBbox": viewBbox});
    } */
    
    const upper = parts.createUpper(svg, boxX, boxY, boxBbox.width/2, 0);
    upper.data({"index": node.index});
    this.group.add(upper);

    const numLower = node.type === 'if'? 3:2;
    let tmp=null;
    [this.lowerPlug, tmp] = parts.createLower(svg, boxX, boxY, boxBbox.width/numLower, boxBbox.height, config.plug_color.flow, sio);
    this.lowerPlug.data({"next": node.next});
    this.group.add(this.lowerPlug).add(tmp);

    this.connectors=[];
    node.outputFiles.forEach((output, fileIndex) => {
      let [plug, cable]= parts.createConnector(svg, boxX, boxY, boxBbox.width, textHeight*fileIndex, sio);
      plug.data({"name": output.name, "dst": output.dst});
      this.group.add(plug);
      this.group.add(cable);
      this.connectors.push(plug);
    });

    node.inputFiles.forEach((input, fileIndex) => {
      const receptor = parts.createReceptor(svg, boxX, boxY, 0, textHeight*fileIndex);
      receptor.data({"index": node.index, "name": input.name});
      this.group.add(receptor);
    });

    if(numLower === 3){
      [this.lower2Plug, tmp] = parts.createLower(svg, boxX, boxY, boxBbox.width/numLower*2, boxBbox.height, config.plug_color.elseFlow, sio)
      this.lower2Plug.addClass('elsePlug').data({"else": node.else});
      this.group.add(this.lower2Plug).add(tmp);
    }

    if(node != null && node.jsonFile != null){
      this.group.data({"path": node.path, "jsonFile": node.jsonFile});
    }

/*     //parent -> children connector
    //データ、位置について考える必要有
    this.connectors=[];
    node.outputFiles.forEach((output, fileIndex) => {
      let [plug, cable]= parts.createParentConnector(svg, boxX, boxY, boxBbox.width, textHeight*fileIndex, sio);
      plug.data({"name": output.name, "dst": output.dst});
      this.group.add(plug);
      this.group.add(cable);
      this.connectors.push(plug);
    });

    //children -> parent connector
    //データ、位置について考える必要有
    node.inputFiles.forEach((input, fileIndex) => {
      const receptor = parts.createParentReceptor(svg, boxX, boxY, 0, textHeight*fileIndex);
      receptor.data({"index": node.index, "name": input.name});
      this.group.add(receptor);
    }); */
    

    // difference between box origin and mouse pointer
    let diffX=0;
    let diffY=0;
    // mouse pointer coordinate on dragstart
    let startX=0;
    let startY=0;
    // register drag and drop behavior
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
    let srcPlug=this.lowerPlug;
    srcPlug.data('next').forEach((dstIndex)=>{
      let dstPlug = upperPlugs.members.find((plug)=>{
        return plug.data('index') === dstIndex;
      });
      const cable = new parts.SvgCable(this.svg, config.plug_color.flow, 'DU', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
      cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
      cable.cable.data('dst', dstIndex);
      this.nextLinks.push(cable);
    });
    if(this.hasOwnProperty('lower2Plug')){
      let srcPlug=this.lower2Plug;
      srcPlug.data('else').forEach((dstIndex)=>{
        let dstPlug = upperPlugs.members.find((plug)=>{
          return plug.data('index') === dstIndex;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.elseFlow, 'DU', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
        cable.cable.data('dst', dstIndex);
        this.elseLinks.push(cable);
      });
    }
    let receptorPlugs=this.svg.select('.receptorPlug');
    this.connectors.forEach((srcPlug)=>{
      srcPlug.data('dst').forEach((dst)=>{
        let dstPlug = receptorPlugs.members.find((plug)=>{
          return plug.data('index') === dst.dstNode && plug.data('name') === dst.dstName;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.file, 'RL', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
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
    let boxBbox=this.group.data('boxBbox');
    this.nextLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.elseLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.outputFileLinks.forEach((v)=>{
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.previousLinks.forEach((v)=>{
      v.dragEndPoint(offsetX, offsetY, boxBbox);
    });
    this.inputFileLinks.forEach((v)=>{
      v.dragEndPoint(offsetX, offsetY, boxBbox);
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

export class SvgChildrenNodeUI{
  /**
   * create new instance
   * @param svg  svg.js's instance
   * @param node any node instance to draw
   */
  constructor(svg, node) {
    /** svg.js's instance*/
    this.svg=svg;

      /** svg representation of this node */
      this.group=svg.group();
      this.group.data({"index": node.index, "type": node.type}).draggable().addClass('node');

      //test Children view
      //if(node.type === 'workflow' || node.type === 'parameterStudy' || node.type === 'for' || node.type === 'while' || node.type === 'foreach'){   
        
        const [viewBox, viewHeight]= new parts.SvgChildrenViewBox(svg, node.pos.x, node.pos.y, node.type, node.name);

        const viewBbox=viewBox.bbox();
        this.group.add(viewBox);
        this.group.data({"viewBbox": viewBbox});
     // }
    }
  }