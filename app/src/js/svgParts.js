import config from './config';
let UDPlug=[[0, 0], [20, 0], [20, 5], [10, 10], [0, 5]];
let LRPlug=[[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]];

/**
 * calc y coord of 1st input/output file from top of the box
 * @return y coord
 */
function calcFileBasePosY() {
  const titleHeight = config.box_appearance.titleHeight;
  const marginHeight = config.box_appearance.marginHeight;
  return titleHeight + marginHeight / 2;
}

/**
 * check if droped plug hit any other counterpart
 * @param svg instance of svg.js
 * @param counterpart selector of counterpart (e.g. '.upperPlut', '.receptorPlug')
 * @param x x coordinate of the point which will be checked
 * @param y y coordinate of the point which will be checked
 */
function collisionDetection(svg, counterpart, x, y){
  let minDistance2=Number.MAX_VALUE;
  let nearestNodeIndex=-1;
  let nearestPlugPoints=null;
  let nearestPlug = null;
  // dropしたplugと対応する種類のplugのうち最も距離が近いものを探す
  svg.select(counterpart).each(function(i, v){
    let index = v[i].parent().node.instance.data('index');
    let points=v[i].node.points;
    let targetX=points[3].x;
    let targetY=points[2].y;
    let distance2=(targetX-x)*(targetX-x)+(targetY-y)*(targetY-y);
    if(minDistance2 > distance2){
      minDistance2 = distance2;
      nearestNodeIndex = index;
      nearestPlugPoints = points;
      nearestPlug = v[i];
    }
  });
  // 最近傍plugの頂点座標から当たり領域を作成
  let xPoints = Array.from(nearestPlugPoints).map((p)=>{
    return p.x;
  });
  let yPoints = Array.from(nearestPlugPoints).map((p)=>{
    return p.y;
  });
  let minX = Math.min(...xPoints);
  let maxX = Math.max(...xPoints);
  let minY = Math.min(...yPoints);
  let maxY = Math.max(...yPoints);
  let extendX = (maxX - minX)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  let extendY = (maxY - minY)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  minX -= extendX;
  maxX += extendX;
  minY -= extendY;
  maxY += extendY;

  // 最近傍plugが範囲内に入っていれば indexとそのplugを返す
  if(minX < x && x< maxX && minY < y&& y< maxY ){
    return [nearestNodeIndex, nearestPlug];
  }
  // 外れの時は -1を二つ(indexとplug)返す
  return [-1, -1];
}

export class SvgCable{
  /**
   * @param svg instance of svg.js
   * @param color color of the cable
   * @param direction direction of the cable. DU(Down to Up) or RL(Right to Legt)
   * @param bbox bouding box of parent
   * @param startX x coordinate of initial start point
   * @param startY y coordinate of initial start point
   * @param endtX x coordinate of initial end point
   * @param endtY y coordinate of initial end point
   */
  constructor(svg, color, direction, bbox, startX, startY, endX, endY){
    this.tmpSvg=svg; //for debug calcControlPoint
    this.cable = svg.path('').fill('none').stroke({ color: color, width: config.box_appearance.strokeWidth});
    this.startX = startX;
    this.startY = startY;
    this.endX = endX || startX;
    this.endY = endY || startY;
    if(direction === 'DU' || direction === 'RL'){
      this.direction = direction;
    }else{
      console.log('illegal direction: ', direction);
    }
    this.boxBbox = bbox;
  }
  _calcControlPoint(sx, sy, ex, ey) {
    const scaleRange=1.5;
    const scaleControlPoint=2;
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    let cp1x=0;
    let cp1y=0;
    let cp2x=0;
    let cp2y=0;
    if(this.direction === 'DU'){
      const offset = this.boxBbox.width*scaleControlPoint;
      if(ey<sy){
        if( sx-this.boxBbox.width*scaleRange < ex && ex < sx+this.boxBbox.width*scaleRange){
          if(sx > ex){
            cp1x=sx+offset;
            cp1y=sy+offset;
            cp2x=ex+offset;
            cp2y=ey-offset;
          }else{
            cp1x=sx-offset;
            cp1y=sy+offset;
            cp2x=ex-offset;
            cp2y=ey-offset;
          }
        }else{
          cp1x=mx;
          cp1y=sy+offset;
          cp2x=mx;
          cp2y=ey-offset;
        }
      }else{
        cp1x=sx;
        cp1y=my;
        cp2x=ex;
        cp2y=my;
      }
    }else if(this.direction === 'RL'){
      const offset = this.boxBbox.height*scaleControlPoint;
      if(ex<sx){
        if(sy-this.boxBbox.height*scaleRange < ey && ey <sy+this.boxBbox.width*scaleRange){
          cp1x=sx+offset;
          cp1y=sy-offset;
          cp2x=ex-offset;
          cp2y=ey-offset;
        }else{
          cp1x=sx+offset;
          cp1y=my;
          cp2x=ex-offset;
          cp2y=my;
        }
      }else{
        cp1x=mx;
        cp1y=sy;
        cp2x=mx;
        cp2y=ey;
      }
    }
    return [cp1x, cp1y, cp2x, cp2y];
  }
  _draw(sx, sy, ex, ey){
    const [cp1x, cp1y, cp2x, cp2y]=this._calcControlPoint(sx, sy, ex, ey);
    this.cable.plot(`M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`)
  }
  dragEndPoint(dx,dy){
    this._draw(this.startX, this.startY, this.endX+dx, this.endY+dy);
  }
  dragStartPoint(dx,dy){
    this._draw(this.startX+dx, this.startY+dy, this.endX, this.endY);
  }
  remove(){
    if(this.cable != null) this.cable.remove();
    this.cable=null;
  }
}
class SvgLower{
  constructor(svg, boxBbox, originX, originY, offsetX, offsetY, color, sio){
    this.plug = svg.polygon(UDPlug).fill(color);
    const bbox = this.plug.bbox();
    originX = originX + offsetX - bbox.width / 2;
    originY = originY + offsetY - bbox.height / 2;
    this.plug.move(originX, originY).draggable();
    let firstTime=true;
    this.cable = new SvgCable(svg, color, 'DU', boxBbox, originX + bbox.width / 2, originY+ bbox.height / 2);
    let clone=null;
    let dragStartPointX=null;
    let dragStartPointY=null;
    this.plug
      .on('dragstart', (e)=>{
        if(firstTime){
          clone = this.plug.clone();
          firstTime=false;
        }
        dragStartPointX = e.detail.p.x;
        dragStartPointY = e.detail.p.y;
      })
      .on('dragmove', (e)=>{
        let dx = e.detail.p.x - dragStartPointX;
        let dy = e.detail.p.y - dragStartPointY;
        this.cable.dragEndPoint(dx,dy);
      })
      .on('dragend', (e)=>{
        this.cable.endX=e.srcElement.instance.cx();
        this.cable.endY=e.srcElement.instance.cy();
        const [hitIndex,] = collisionDetection(svg, '.upperPlug', this.cable.endX, this.cable.endY);
        if(hitIndex === -1) return;
        const myIndex=this.plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          sio.emit('addLink', {src: myIndex, dst: hitIndex, isElse: this.plug.hasClass('elsePlug')});
          this.cable.remove();
          this.plug.remove();
          this.plug = clone
        }
      });
  }
}
class SvgConnector{
  constructor(svg, originX, originY, offsetX, offsetY, sio){
    this.plug = svg.polygon(LRPlug).fill(config.plug_color.file);
    this.bbox = this.plug.bbox();
    this.originX = originX + offsetX - this.bbox.width / 2;
    this.originY = originY + offsetY;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = new SvgCable(svg, config.plug_color.file, 'RL', this.bbox, this.originX + this.bbox.width / 2, this.originY+ this.bbox.height / 2);
    this.plug
      .on('dragstart', (e)=>{
        if(this.firstTime){
          let clone = this.plug.clone();
          this.clonedPlug = clone;
        }
        this.firstTime=false;
        this.dragStartX = e.detail.p.x;
        this.dragStartY = e.detail.p.y;
      })
      .on('dragmove', (e)=>{
        let dx = e.detail.p.x - this.dragStartX;
        let dy = e.detail.p.y - this.dragStartY;
        this.cable.dragEndPoint(dx,dy);
      })
      .on('dragend',  (e)=>{
        this.cable.endX=e.srcElement.instance.cx();
        this.cable.endY=e.srcElement.instance.cy();
        const [hitIndex, hitPlug] = collisionDetection(svg, '.receptorPlug', this.cable.endX, this.cable.endY);
        if(hitIndex === -1) return;
        const myIndex=this.plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          let srcName = this.plug.data('name');
          let dstName = hitPlug.data('name');
          sio.emit('addFileLink', {src: myIndex, dst: hitIndex, srcName: srcName, dstName: dstName});
          this.cable.remove();
          this.plug.remove();
          this.plug = this.clonedPlug;
        }
      });
  }
}

class SvgBox{
  constructor(svg, x, y, type, name, inputFiles, outputFiles){
    this.draw=svg;
    this.type=type.toLowerCase();

    // read draw settings from config
    const opacity = config.box_appearance.opacity;
    const strokeWidth = config.box_appearance.strokeWidth;
    const titleHeight = config.box_appearance.titleHeight;
    const marginHeight = config.box_appearance.marginHeight;
    const marginWidth = titleHeight * 2;
    const outputTextOffset = config.box_appearance.outputTextOffset;
    const nodeColor=config.node_color[this.type];

    // create inner parts
    const input = this.createInputText(inputFiles);
    const output = this.createOutputText(outputFiles);

    const outputBBox = output.bbox();
    const inputBBox =  input.bbox();

    const bodyHeight = marginHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
    this.height = bodyHeight + titleHeight;

    const title = this.createTitle(name);
    this.width = Math.ceil(Math.max(inputBBox.width + outputBBox.width, title.bbox().width)) + marginWidth;

    const outerFrame = this.createOuterFrame();
    const innerFrame = this.createInnerFrame();

    this.box = this.draw.group();
    this.box
      .add(outerFrame)
      .add(innerFrame)
      .add(title)
      .add(input)
      .add(output)
      .move(x, y)
      .style('cursor', 'default')
      .opacity(opacity)
      .addClass('box');

    // adjust size
    output.x(this.width);
    innerFrame.size(this.width - strokeWidth, bodyHeight);
  }

  /**
   * create outer frame
   * @return outer frame element
   */
  createOuterFrame() {
    const titleHeight = config.box_appearance['titleHeight'];
    const nodeColor=config.node_color[this.type];
    return  this.draw
      .polygon([
          [titleHeight / 2, 0],
          [this.width, 0],
          [this.width, titleHeight],
          [0, titleHeight],
          [0, titleHeight / 2]
      ])
      .fill(nodeColor);
  }
  /**
   * create inner frame
   * @return inner frame element
   */
  createInnerFrame() {
    const titleHeight = config.box_appearance['titleHeight'];
    const strokeWidth = config.box_appearance['strokeWidth'];
    const nodeColor=config.node_color[this.type];
    return  this.draw
      .rect(0, 0)
      .attr({
        'fill': 'rgb(50, 50, 50)',
        'stroke': nodeColor,
        'stroke-width': strokeWidth
      })
    .move(strokeWidth / 2, titleHeight);
  }
  /**
   * create title
   * @return title element
   */
  createTitle(name) {
    const titleHeight = config.box_appearance.titleHeight;
    return this.draw
      .text(name)
      .fill('#111')
      .x(titleHeight / 2)
      .cy(titleHeight / 2);
  }
  /**
   * create output file text
   * @return output file text
   */
  createOutputText(outputFiles) {
    this.outputGroup = this.draw.group();
    outputFiles.forEach((output, index) => {
      const text = this.draw
        .text(output.name)
        .fill('white');
      this.textHeight=text.bbox().height*config.box_appearance.textHeightScale;
      const x = -text.bbox().width-config.box_appearance.outputTextOffset;
      const y = calcFileBasePosY()+this.textHeight*index;
      text.move(x, y);
      this.outputGroup.add(text);
    });
    return this.outputGroup;
  }
  /**
   * create input file text
   * @return input file text
   */
  createInputText(inputFiles) {
    this.inputGroup = this.draw.group();
    inputFiles.forEach((input, index) => {
      const text = this.draw
        .text(input.name)
        .fill('white');
      this.textHeight=text.bbox().height*config.box_appearance.textHeightScale;
      const x = config.box_appearance.outputTextOffset;
      const y = calcFileBasePosY()+this.textHeight*index;
      text.move(x, y);
      this.inputGroup.add(text);
    });
    return this.inputGroup;
  }
}

export function createConnector(svg, boxX, boxY, offsetX, offsetY, sio){
  const baseOffsetY=calcFileBasePosY();
  return  new SvgConnector(svg, boxX, boxY, offsetX, baseOffsetY + offsetY, sio);
}
export function createReceptor(svg, boxX, boxY, offsetX, offsetY){
  const baseOffsetY=calcFileBasePosY();
  const plug = svg.polygon(LRPlug).fill(config.plug_color.file).addClass('receptorPlug');
  const bbox = plug.bbox();
  plug.move(boxX+offsetX-bbox.width / 2, boxY+baseOffsetY + offsetY);
  return plug;
}
export function createUpper(svg, boxX, boxY, offsetX, offsetY){
  const plug = svg.polygon(UDPlug).fill(config.plug_color.flow).addClass('upperPlug');
  const bbox = plug.bbox();
  plug.move(boxX+offsetX-bbox.width/2, boxY+offsetY-bbox.height / 2);
  return plug;
}
export function createLower(svg, boxBbox, originX, originY, offsetX, offsetY, color, sio){
    let plug = svg.polygon(UDPlug).fill(color);
    const bbox = plug.bbox();
    originX = originX + offsetX - bbox.width / 2;
    originY = originY + offsetY - bbox.height / 2;
    plug.move(originX, originY).draggable();
    let firstTime=true;
    const cable = new SvgCable(svg, color, 'DU', boxBbox, originX + bbox.width / 2, originY+ bbox.height / 2);
    let clone=null;
    let dragStartPointX=null;
    let dragStartPointY=null;
    plug
      .on('dragstart', (e)=>{
        if(firstTime){
          clone = plug.clone();
          firstTime=false;
        }
        dragStartPointX = e.detail.p.x;
        dragStartPointY = e.detail.p.y;
      })
      .on('dragmove', (e)=>{
        let dx = e.detail.p.x - dragStartPointX;
        let dy = e.detail.p.y - dragStartPointY;
        cable.dragEndPoint(dx,dy);
      })
      .on('dragend', (e)=>{
        cable.endX=e.srcElement.instance.cx();
        cable.endY=e.srcElement.instance.cy();
        const [hitIndex,] = collisionDetection(svg, '.upperPlug', cable.endX, cable.endY);
        if(hitIndex === -1) return;
        const myIndex=plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          sio.emit('addLink', {src: myIndex, dst: hitIndex, isElse: plug.hasClass('elsePlug')});
          cable.remove();
          plug.remove();
          plug = clone
        }
      });
  return {plug: plug, cable: cable};
}
export function createBox (svg, x, y, type, name, inputFiles, outputFiles){
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles);
  return {box: box.box, textHeight: box.textHeight};
}

