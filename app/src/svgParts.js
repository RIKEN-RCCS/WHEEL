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
 * plot cubic Bézier curve connecting between two points
 * @param svg.path object
 * @param sx x coordinate of start point
 * @param sy y coordinate of start point
 * @param ex x coordinate of end point
 * @param ey y coordinate of end point
 */
function plotCable(cable, sx, sy, ex, ey){
  const my = (sy + ey) / 2;
  cable.plot(`M ${sx} ${sy} C ${sx} ${my} ${ex} ${my} ${ex} ${ey}`)
}

/**
 * calc coordinate of given path
 * @param points collection of vertex coordinate
 * please note that points must be convex polygon
 */
function calcCenter(points){
  let sumX=0;
  let sumY=0;
  let numPoints=0;
  for(let v of points){
    sumX+=v.x;
    sumY+=v.y;
    numPoints++;
  }
  return {x: sumX/numPoints, y: sumY/numPoints}
}

/**
 * plot cable between original and dragging plug
 * this function is for callback on dragmove event of SvgLower and SvgConnector 's plug
 * @param e argument of callback function of dragmove event
 */
function plotLink(e){
  const sx = this.originX + this.bbox.width / 2;
  const sy = this.originY + this.bbox.height / 2;
  const center = calcCenter(e.srcElement.animatedPoints);
  plotCable(this.cable, sx, sy, center.x, center.y);
}

/**
 * check if droped plug hit any other counterpart
 * @param svg instance of svg.js
 * @param counterpart selector of counterpart (e.g. '.upperPlut', '.receptorPlug')
 * @param point coordinate which will be checked
 */
function collisionDetection(svg, counterpart, point){
  let minDistance2=Number.MAX_VALUE;
  let nearestNodeIndex=-1;
  let minPoints=null;
  let nearestPlug = null;
  svg.select(counterpart).each(function(i, v){
    let index = v[i].parent().node.instance.data('index');
    let points=v[i].node.points;
    let x=points[3].x;
    let y=points[2].y;
    let distance2=(x-point.x)*(x-point.x)+(y-point.y)*(y-point.y);
    if(minDistance2 > distance2){
      minDistance2 = distance2;
      nearestNodeIndex = index;
      minPoints = points;
      nearestPlug = v[i];
    }
  });
  let extendX = (minPoints[1].x - minPoints[0].x)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  let extendY = (minPoints[3].y - minPoints[0].y)*(config.box_appearance.plug_drop_area_scale - 1.0)/2;
  if(minPoints[0].x - extendX < point.x && point.x< minPoints[1].x +extendX && minPoints[0].y -extendY < point.y&& point.y< minPoints[3].y +extendY){
    return [nearestNodeIndex, nearestPlug];
  }
  return [-1, -1];
}


class SvgLower{
  constructor(svg, originX, originY, offsetX, offsetY, color, createLink){
    this.plug = svg.polygon(UDPlug).fill(color);
    this.bbox = this.plug.bbox();
    this.originX = originX + offsetX - this.bbox.width / 2;
    this.originY = originY + offsetY - this.bbox.height / 2;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = svg.path('').fill('none').stroke({ color: color, width: 2 });
    this.plug.on('dragstart', ()=>{
      if(this.firstTime){
        let clone = this.plug.clone();
        this.clonedPlug = this.plug;
        this.plug=clone;
      }
      this.firstTime=false;
    })
    .on('dragmove', plotLink.bind(this))
      .on('dragend',  (e)=>{
        const center = calcCenter(e.srcElement.animatedPoints);
        const [hitIndex,] = collisionDetection(svg, '.upperPlug', center);
        if(hitIndex === -1) return;
        const myIndex=this.plug.parent().node.instance.data('index');
        if(hitIndex!== myIndex){
          createLink(myIndex, hitIndex, this.plug.hasClass('elsePlug'));
          this.cable.remove();
          this.clonedPlug.remove();
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
    this.cable = svg.path('').fill('none').stroke({ color: config.plug_color.file, width: 2 });
    this.plug.on('dragstart', ()=>{
      if(this.firstTime){
        let clone = this.plug.clone();
        this.clonedPlug = this.plug;
        this.plug=clone;
      }
      this.firstTime=false;
    })
    .on('dragmove', plotLink.bind(this))
    .on('dragend',  (e)=>{
      const center = calcCenter(e.srcElement.animatedPoints);
      const [hitIndex, hitPlug] = collisionDetection(svg, '.receptorPlug', center);
      if(hitIndex === -1) return;
      const myIndex=this.plug.parent().node.instance.data('index');
      if(hitIndex!== myIndex){
        //TODO to be fixed
        let srcName = this.plug.data('name');
        let dstName = hitPlug.data('name');
        createFileLink(myIndex, hitIndex, srcName, dstName);
        this.cable.remove();
        this.clonedPlug.remove();
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
    connector.plug.data('name', output.name);
    connectors.push(connector);
  });
  return connectors
}
export function createReceptors(inputFiles, svg, boxX, boxY, offsetX, offsetY){
  let receptors=[];
  const baseOffsetY=calcFileBasePosY();
  inputFiles.forEach((input, fileIndex) => {
    const receptor = new SvgReceptor(svg, boxX, boxY, offsetX, baseOffsetY + offsetY*fileIndex)
    receptor.plug.data('name', input.name);
    receptors.push(receptor);
  });
  return receptors;
}

export function createUpper(svg, boxX, boxY, offsetX, offsetY){
  return new SvgUpper(svg, boxX, boxY, offsetX, offsetY);
}
export function createLower(svg, boxX, boxY, offsetX, offsetY, color, createLink){
  const lower=new SvgLower(svg, boxX, boxY, offsetX, offsetY, color, createLink);
  return {plug: lower.plug, cable: lower.cable};
}
export function createBox (svg, x, y, type, name, inputFiles, outputFiles){
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles);
  return {box: box.box, textHeight: box.textHeight};
}

