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

class SvgLower{
  constructor(svg, originX, originY, offsetX, offsetY, color){
    this.plug = svg.polygon(UDPlug).fill(color);
    const bbox = this.plug.bbox();
    this.originX = originX + offsetX - bbox.width / 2;
    this.originY = originY + offsetY - bbox.height / 2;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = svg.path('').fill('none').stroke({ color: color, width: 2 });
    this.plug.on('dragstart', ()=>{
      if(this.firstTime) this.plug.clone();
      this.firstTime=false;
    })
    .on('dragmove', (e)=>{
      let x =e.srcElement.animatedPoints[3].x;
      let y =e.srcElement.animatedPoints[2].y;
      const sx = this.originX + bbox.width / 2;
      const sy = this.originY + bbox.height / 2;
      const ex = x;
      const ey = y;
      const my = (sy + ey) / 2;
      this.cable.plot(`M ${sx} ${sy} C ${sx} ${my} ${ex} ${my} ${ex} ${ey}`)
    })
    .on('dragend', (e)=>{
      let lowerX =e.srcElement.animatedPoints[3].x;
      let lowerY =e.srcElement.animatedPoints[2].y;
      let minDistance2=Number.MAX_VALUE;
      let minIndex=-1;
      let minPoints=null;
      svg.select('.upperPlug').each(function(i, v){
        let index = v[i].parent().node.instance.data('index');
        let points=v[i].node.points;
        let x=points[3].x;
        let y=points[2].y;
        let distance2=(x-lowerX)*(x-lowerX)+(y-lowerY)*(y-lowerY);
        if(minDistance2 > distance2){
          minDistance2 = distance2;
          minIndex = index;
          minPoints = points;
        }
      });
      if(minPoints[0].x < lowerX && lowerX < minPoints[1].x && minPoints[0].y < lowerY && lowerY < minPoints[3].y){
        let myIndex=this.plug.parent().node.instance.data('index');
        if(minIndex !== myIndex){
          if(this.plug.hasClass('elsePlug')){
            console.log("connected : else side of ", myIndex, " to ", minIndex);
          }else{
            console.log("connected :", myIndex, " to ", minIndex);
          }
        }
      }
    });
  }
}
class SvgConnector{
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(LRPlug).fill(config.plug_color.file);
    const bbox = this.plug.bbox();
    this.originX = originX + offsetX - bbox.width / 2;
    this.originY = originY + offsetY;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = svg.path('').fill('none').stroke({ color: config.plug_color.file, width: 2 });
    this.plug.on('dragstart', ()=>{
      if(this.firstTime) this.plug.clone();
      this.firstTime=false;
    });
    this.plug.on('dragmove', (e)=>{
      let point=e.srcElement.animatedPoints[3];
      const sx = this.originX + bbox.width / 2;
      const sy = this.originY + bbox.height / 2;
      const ex = point.x;
      const ey = point.y;
      const my = (sy + ey) / 2;
      this.cable.plot(`M ${sx} ${sy} C ${sx} ${my} ${ex} ${my} ${ex} ${ey}`)
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

export function createConnectors(outputFiles, svg, boxX, boxY, offsetX, offsetY){
  let connectors=[];
  const baseOffsetY=calcFileBasePosY();
  outputFiles.forEach((output, fileIndex) => {
    const connector = new SvgConnector(svg, boxX, boxY, offsetX, baseOffsetY + offsetY*fileIndex);
    connectors.push(connector);
  });
  return connectors
}
export function createReceptors(inputFiles, svg, boxX, boxY, offsetX, offsetY){
  let receptors=[];
  const baseOffsetY=calcFileBasePosY();
  inputFiles.forEach((input, fileIndex) => {
    const receptor = new SvgReceptor(svg, boxX, boxY, offsetX, baseOffsetY + offsetY*fileIndex)
    receptors.push(receptor);
  });
  return receptors;
}

export function createUpper(svg, boxX, boxY, offsetX, offsetY){
  return new SvgUpper(svg, boxX, boxY, offsetX, offsetY);
}
export function createLower(svg, boxX, boxY, offsetX, offsetY, color){
  const lower=new SvgLower(svg, boxX, boxY, offsetX, offsetY, color);
  return {plug: lower.plug, cable: lower.cable};
}
export function createBox (svg, x, y, type, name, inputFiles, outputFiles){
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles);
  return {box: box.box, textHeight: box.textHeight};
}

