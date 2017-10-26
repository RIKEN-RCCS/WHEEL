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
 * calc centroid coordinate of given path
 * @param points collection of vertex coordinate
 * @return x,y coordinate of the centroid
 * please note that points must be convex polygon
 */
export function calcCenter(points){
  let sumX=0;
  let sumY=0;
  let numPoints=0;
  for(let v of points){
    sumX+=v.x;
    sumY+=v.y;
    numPoints++;
  }
  return [sumX/numPoints, sumY/numPoints]
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
  console.log(xPoints);
  let yPoints = Array.from(nearestPlugPoints).map((p)=>{
    return p.y;
  });
  console.log(yPoints);
  let minX = Math.min(...xPoints);
  let maxX = Math.max(...xPoints);
  let minY = Math.min(...yPoints);
  let maxY = Math.max(...yPoints);
  console.log(minX, maxX, minY, maxY);
  let extendX = (maxX - minX)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  let extendY = (maxY - minY)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  console.log(extendX, extendY);
  minX -= extendX;
  maxX += extendX;
  minY -= extendY;
  maxY += extendY;
  console.log(minX, maxX, minY, maxY);

  // 最近傍plugが範囲内に入っていれば indexとそのplugを返す
  if(minX < x && x< maxX && minY < y&& y< maxY ){
    return [nearestNodeIndex, nearestPlug];
  }
  // 外れの時は -1を二つ(indexとplug)返す
  return [-1, -1];
}

export class SvgCable{
  constructor(svg, color, startX, startY, endX, endY){
    this.cable = svg.path('').fill('none').stroke({ color: color, width: config.box_appearance.strokeWidth});
    this.startX = startX;
    this.startY = startY;
    this.endX = endX || startX;
    this.endY = endY || startY;
    this._draw(this.startX, this.startY, this.endX, this.endY);
  }
  _draw(sx, sy, ex, ey){
    const my = (sy + ey) / 2;
    this.cable.plot(`M ${sx} ${sy} C ${sx} ${my} ${ex} ${my} ${ex} ${ey}`)
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
  constructor(svg, originX, originY, offsetX, offsetY, color, createLink){
    this.plug = svg.polygon(UDPlug).fill(color);
    this.bbox = this.plug.bbox();
    this.originX = originX + offsetX - this.bbox.width / 2;
    this.originY = originY + offsetY - this.bbox.height / 2;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = new SvgCable(svg, color, this.originX + this.bbox.width / 2, this.originY+ this.bbox.height / 2);
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
      .on('dragend', (e)=>{
        const [x, y]= calcCenter(e.srcElement.animatedPoints);
        this.cable.endX=x;
        this.cable.endY=y;
        const [hitIndex,] = collisionDetection(svg, '.upperPlug', x, y);
        if(hitIndex === -1) return;
        const myIndex=this.plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          createLink(myIndex, hitIndex, this.plug.hasClass('elsePlug'));
          this.cable.remove();
          this.plug.remove();
          this.plug = this.clonedPlug;
        }
      });
  }
}
class SvgConnector{
  constructor(svg, originX, originY, offsetX, offsetY, createFileLink){
    this.plug = svg.polygon(LRPlug).fill(config.plug_color.file);
    this.bbox = this.plug.bbox();
    this.originX = originX + offsetX - this.bbox.width / 2;
    this.originY = originY + offsetY;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = new SvgCable(svg, config.plug_color.file, this.originX + this.bbox.width / 2, this.originY+ this.bbox.height / 2);
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
        const [x, y]= calcCenter(e.srcElement.animatedPoints);
        const [hitIndex, hitPlug] = collisionDetection(svg, '.receptorPlug', x, y);
        this.cable.endX=x;
        this.cable.endY=y;
        if(hitIndex === -1) return;
        const myIndex=this.plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          let srcName = this.plug.data('name');
          let dstName = hitPlug.data('name');
          createFileLink(myIndex, hitIndex, srcName, dstName);
          this.cable.remove();
          this.plug.remove();
          this.plug = this.clonedPlug;
        }
      });
  }
}
class SvgUpper{
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(UDPlug).fill(config.plug_color.flow).addClass('upperPlug');
    const bbox = this.plug.bbox();
    offsetX -= bbox.width / 2;
    offsetY -= bbox.height / 2;
    this.plug.move(originX+offsetX, originY+offsetY);
  }
}
class SvgReceptor {
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(LRPlug).fill(config.plug_color.file).addClass('receptorPlug');
    const bbox = this.plug.bbox();
    offsetX -= bbox.width / 2;
    this.plug.move(originX+offsetX, originY+offsetY);
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

export function createConnectors(outputFiles, svg, boxX, boxY, offsetX, offsetY, createFileLink){
  let connectors=[];
  const baseOffsetY=calcFileBasePosY();
  outputFiles.forEach((output, fileIndex) => {
    const connector = new SvgConnector(svg, boxX, boxY, offsetX, baseOffsetY + offsetY*fileIndex, createFileLink);
    connector.plug.data({'name': output.name, 'dstNode': output.dstNode, 'dstName': output.dstName});
    connectors.push(connector);
  });
  return connectors
}
export function createReceptors(inputFiles, svg, boxX, boxY, offsetX, offsetY){
  let receptors=[];
  const baseOffsetY=calcFileBasePosY();
  inputFiles.forEach((input, fileIndex) => {
    const receptor = new SvgReceptor(svg, boxX, boxY, offsetX, baseOffsetY + offsetY*fileIndex)
    receptor.plug.data({'name': input.name, 'srcNode': input.srcNode, 'srcName': input.srcName});
    receptors.push(receptor);
  });
  return receptors;
}
export function createUpper(svg, boxX, boxY, offsetX, offsetY){
  return new SvgUpper(svg, boxX, boxY, offsetX, offsetY);
}
export function createLower(svg, boxX, boxY, offsetX, offsetY, color, createLink){
  return new SvgLower(svg, boxX, boxY, offsetX, offsetY, color, createLink);
}
export function createBox (svg, x, y, type, name, inputFiles, outputFiles){
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles);
  return {box: box.box, textHeight: box.textHeight};
}

