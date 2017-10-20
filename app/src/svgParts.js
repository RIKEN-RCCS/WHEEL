import config from './config';
let UDPlug=[[0, 0], [20, 0], [20, 5], [10, 10], [0, 5]];
let LRPlug=[[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]];

class SvgUpper{
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(UDPlug).fill(config.plug_color.flow);
    const bbox = this.plug.bbox();
    offsetX -= bbox.width / 2;
    offsetY -= bbox.height / 2;
    this.plug.move(originX, originY).translate(offsetX, offsetY);
  }
}
class SvgReceptor {
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(LRPlug).fill(config.plug_color.file);
    const bbox = this.plug.bbox();
    /*
                offsetX: -8,
                offsetY: SvgBox.caclPlugPosY(fileIndex),
                */
    offsetX -= bbox.width / 2;
    offsetY -= bbox.height / 2;
    this.plug.move(originX, originY).translate(offsetX, offsetY);
  }
}
class SvgLower{
  constructor(svg, originX, originY, offsetX, offsetY){
    this.plug = svg.polygon(UDPlug).fill(config.plug_color.flow);
    const bbox = this.plug.bbox();
    this.originX = originX + offsetX - bbox.width / 2;
    this.originY = originY + offsetY - bbox.height / 2;
    this.plug.move(this.originX, this.originY).draggable();
    this.firstTime=true;
    this.cable = svg.path('').fill('none').stroke({ color: config.plug_color.flow, width: 2 });
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
class SvgBox{
  constructor(svg, x, y, type, name, inputFiles, outputFiles){
    this.draw=svg;
    this.type=type.toLowerCase();
    this.name=name;
    this.inputFiles=inputFiles;
    this.outputFiles=outputFiles;

    // draw settings
    this.opacity = 0.6;
    this.strokeWidth = 2;
    this.titleHeight = 20;
    this.marginHeight = 12;
    this.marginWidth = this.titleHeight * 2;
    this.outputTextOffset = -8;
    this.stepSize = 25;
    this.nodeColor=config.node_color[this.type];

    // create inner parts
    const input = this.createInput();
    const output = this.createOutput();

    const outputBBox = output.bbox();
    const inputBBox =  input.bbox();

    const bodyHeight = this.marginHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));
    this.height = bodyHeight + this.titleHeight;

    const title = this.createTitle();
    this.width = Math.ceil(Math.max(inputBBox.width + outputBBox.width, title.bbox().width)) + this.marginWidth;

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
      .opacity(this.opacity);

    // adjust size
    output.x(this.width + this.outputTextOffset);
    innerFrame.size(this.width - this.strokeWidth, bodyHeight);
  }

  /**
   * create outer frame
   * @return outer frame element
   */
  createOuterFrame() {
    return  this.draw
      .polygon([
          [this.titleHeight / 2, 0],
          [this.width, 0],
          [this.width, this.titleHeight],
          [0, this.titleHeight],
          [0, this.titleHeight / 2]
      ])
      .fill(this.nodeColor);
  }
  /**
   * create inner frame
   * @return inner frame element
   */
  createInnerFrame() {
    return  this.draw
      .rect(0, 0)
      .attr({
        'fill': 'rgb(50, 50, 50)',
        'stroke': this.nodeColor,
        'stroke-width': this.strokeWidth
      })
    .move(this.strokeWidth / 2, this.titleHeight);
  }
  /**
   * create title 
   * @return title element
   */
  createTitle() {
    return this.draw
      .text(this.name)
      .fill('#111')
      .x(this.titleHeight / 2)
      .cy(this.titleHeight / 2);
  }
  /**
   * create output file text
   * @return output file text
   */
  createOutput() {
    this.outputGroup = this.draw.group();
    this.outputFiles.forEach((output, index) => {
      if(!output) return;
      const y = this.caclPlugPosY(index);
      const text = this.draw
        .text(output.name)
        .fill('white')
        .y(y);
      text.x(-text.bbox().width);
      this.outputGroup.add(text);
    });
    return this.outputGroup;
  }
  /**
   * create input file text
   * @return input file text
   */
  createInput() {
    this.inputGroup = this.draw.group();
    this.inputFiles.forEach((input, index) => {
      if(!input) return;
      const y = this.caclPlugPosY(index);
      const text = this.draw
        .text(input.name)
        .fill('white')
        .move(12, y);
      this.inputGroup.add(text);
    });
    return this.inputGroup;
  }
  /**
   * calc y position from top
   * @param index index number from top
   * @return y position
   */
  caclPlugPosY(index) {
    return this.titleHeight + this.marginHeight / 2 + index * this.stepSize;
  }
}

export function createUpper(svg, originX, originY, offsetX, offsetY){
  return new SvgUpper(svg, originX, originY, offsetX, offsetY).plug;
}
export function createLower(svg, originX, originY, offsetX, offsetY){
  const lower=new SvgLower(svg, originX, originY, offsetX, offsetY);
  return {plug: lower.plug, cable: lower.cable};
}
export function createBox (svg, x, y, type, name, inputFiles, outputFiles){
  return new SvgBox(svg, x, y, type, name, inputFiles, outputFiles).box;
}

