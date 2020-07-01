/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
import config from './config';
import showMessage from './showMessage';
import '../css/workflow.css';

let UPlug = [[0, 0], [20, 0], [20, 8], [0, 8]];
let DPlug = [[0, 0], [20, 0], [10, 12]];
let LPlug = [[0, 0], [10, 0], [10, 20], [0, 20]];
let RPlug = [[0, 0], [10, 10], [0, 20]];
/*親子間用　右左逆*/
let parentRPlug = [[0, 0], [16, 0], [16, 32], [0, 32]];
let parentLPlug = [[0, 0], [16, 16], [0, 32]];
//let UDPlug = [[0, 0], [20, 0], [20, 5], [10, 10], [0, 5]]
//let LRPlug = [[0, 0], [8, 0], [16, 8], [8, 16], [0, 16]];

/**
 * calc y coord of 1st input/output file from top of the box
 * @return y coord
 */
function calcFileBasePosY() {
  const titleHeight = config.box_appearance.titleHeight + config.box_appearance.filenameHeightOffset;
  return titleHeight;
}

/**
 * check if droped Frame hit any other counterpart
 * @param svg instance of svg.js
 * @param counterpart selector of counterpart (e.g. '.titleFrame')
 * @param x x coordinate of the point which will be checked
 * @param y y coordinate of the point which will be checked
 */
function collisionDetectionFrame(svg, counterpart, x, y, hitScale) {
  let minDistance2 = Number.MAX_VALUE;
  let nearestNodeIndex = -1;
  let nearestFramePoints = null;
  let nearestFrame = null;
  let nearestFrameBox = null;
  // dropしたFrameと対応する種類のFrameのうち最も距離が近いものを探す
  svg.select(counterpart).each(function (i, v) {
    let index = v[i].parent().node.instance.data('ID');
    const box = v[i].parent();
    const points = v[i].node.points;
    const boxX = box.x();
    const boxY = box.y();

    // can not use length for Edge browse 
    if (points.numberOfItems > 1) {

      // getItem() method for Edge browse 
      let minX = points.getItem(0).x;
      let maxX = points.getItem(0).x;
      let minY = points.getItem(0).y;
      let maxY = points.getItem(0).y;
      // can not use length for Edge browse 
      for (var pointsIndex = 1; pointsIndex < points.numberOfItems; pointsIndex++) {
        if (minX > points.getItem(pointsIndex).x) minX = points.getItem(pointsIndex).x;
        if (maxX < points.getItem(pointsIndex).x) maxX = points.getItem(pointsIndex).x;
        if (minY > points.getItem(pointsIndex).y) minY = points.getItem(pointsIndex).y;
        if (maxY < points.getItem(pointsIndex).y) maxY = points.getItem(pointsIndex).y;
      }

      minX += boxX;
      maxX += boxX;
      minY += boxY;
      maxY += boxY;

      const connectorWidth = maxX - minX;
      const connectorHeight = maxY - minY;
      let connectorCenterXpos = x + connectorWidth * 0.5;
      let connectorCenterYpos = y + connectorHeight * 0.5;
      // replace points[0] -> .getItem() method for Edge browse 
      // let targetX = (points[0].x + points[1].x) * 0.5;
      // let targetY = (points[0].y + points[3].y) * 0.5;
      let targetX = boxX + (points.getItem(0).x + points.getItem(1).x) * 0.5;
      let targetY = boxY + (points.getItem(0).y + points.getItem(3).y) * 0.5;
      let distance2 = (targetX - connectorCenterXpos) * (targetX - connectorCenterXpos) + (targetY - connectorCenterYpos) * (targetY - connectorCenterYpos);

      if (minDistance2 > distance2) {
        minDistance2 = distance2;
        nearestNodeIndex = index;
        //child -> parentのとき
        //親のindexは定義されていないためhit対象にundefinedが来たらindex=parent
        if (index === undefined) {
          nearestNodeIndex = "parent";
        }
        nearestFramePoints = points;
        nearestFrame = v[i];
        nearestFrameBox = box;
      }
    }
  });
  if (nearestFramePoints === null) return [-1, -1];
  // object SVGPointList(nearestFramePoints)-> object array(arrangeSVGPointList) for Edge browse.
  let arrangeSVGPointList = [];
  for (var svgPointListIndex = 0; svgPointListIndex < 4; svgPointListIndex++) {
    arrangeSVGPointList.push(nearestFramePoints.getItem(svgPointListIndex));
  }

  let xPoints = Array.from(arrangeSVGPointList).map((p) => {
    return p.x;
  });
  let yPoints = Array.from(arrangeSVGPointList).map((p) => {
    return p.y;
  });
  let minX = Math.min(...xPoints);
  let maxX = Math.max(...xPoints);
  let minY = Math.min(...yPoints);
  let maxY = Math.max(...yPoints);
  let extendX = (maxX - minX) * (hitScale - 1.0) / 2;
  let extendY = (maxY - minY) * (hitScale - 1.0) / 2;
  minX -= extendX;
  maxX += extendX;
  minY -= extendY;
  maxY += extendY;
  minX += nearestFrameBox.x();
  maxX += nearestFrameBox.x();
  minY += nearestFrameBox.y();
  maxY += nearestFrameBox.y();
  // 最近傍Frameが範囲内に入っていれば indexとそのFrameを返す
  if (minX < x && x < maxX && minY < y && y < maxY) {
    return [nearestNodeIndex, nearestFrame];
  }
  // 外れの時は -1を二つ(indexとFrame)返す
  return [-1, -1];
}

/**
 * check if droped plug hit any other counterpart
 * @param svg instance of svg.js
 * @param counterpart selector of counterpart (e.g. '.upperPlut', '.receptorPlug')
 * @param x x coordinate of the point which will be checked
 * @param y y coordinate of the point which will be checked
 */
function collisionDetection(svg, counterpart, x, y, hitScale) {
  let minDistance2 = Number.MAX_VALUE;
  let nearestNodeIndex = -1;
  let nearestPlugPoints = null;
  let nearestPlug = null;
  // dropしたplugと対応する種類のplugのうち最も距離が近いものを探す
  svg.select(counterpart).each(function (i, v) {
    let index = v[i].parent().node.instance.data('ID');
    let points = v[i].node.points;

    // can not use length for Edge browse 
    if (points.numberOfItems > 1) {

      // getItem() method for Edge browse 
      let minX = points.getItem(0).x;
      let maxX = points.getItem(0).x;
      let minY = points.getItem(0).y;
      let maxY = points.getItem(0).y;
      // can not use length for Edge browse 
      for (var pointsIndex = 1; pointsIndex < points.numberOfItems; pointsIndex++) {
        if (minX > points.getItem(pointsIndex).x) minX = points.getItem(pointsIndex).x;
        if (maxX < points.getItem(pointsIndex).x) maxX = points.getItem(pointsIndex).x;
        if (minY > points.getItem(pointsIndex).y) minY = points.getItem(pointsIndex).y;
        if (maxY < points.getItem(pointsIndex).y) maxY = points.getItem(pointsIndex).y;
      }

      const connectorWidth = maxX - minX;
      const connectorHeight = maxY - minY;
      let connectorCenterXpos = x + connectorWidth * 0.5;
      let connectorCenterYpos = y + connectorHeight * 0.5;
      // replace points[0] -> .getItem() method for Edge browse 
      // let targetX = (points[0].x + points[1].x) * 0.5;
      // let targetY = (points[0].y + points[3].y) * 0.5;
      let targetX = (points.getItem(0).x + points.getItem(1).x) * 0.5;
      let targetY = (points.getItem(0).y + points.getItem(3).y) * 0.5;
      let distance2 = (targetX - connectorCenterXpos) * (targetX - connectorCenterXpos) + (targetY - connectorCenterYpos) * (targetY - connectorCenterYpos);

      if (minDistance2 > distance2) {
        minDistance2 = distance2;
        nearestNodeIndex = index;
        //child -> parentのとき
        //親のindexは定義されていないためhit対象にundefinedが来たらindex=parent
        if (index === undefined) {
          nearestNodeIndex = "parent";
        }
        nearestPlugPoints = points;
        nearestPlug = v[i];
      }
    }
  });
  if (nearestPlugPoints === null) return [-1, -1];

  // object SVGPointList(nearestPlugPoints)-> object array(arrangeSVGPointList) for Edge browse.
  let arrangeSVGPointList = [];
  for (var svgPointListIndex = 0; svgPointListIndex < 4; svgPointListIndex++) {
    arrangeSVGPointList.push(nearestPlugPoints.getItem(svgPointListIndex));
  }

  let xPoints = Array.from(arrangeSVGPointList).map((p) => {
    return p.x;
  });
  let yPoints = Array.from(arrangeSVGPointList).map((p) => {
    return p.y;
  });
  let minX = Math.min(...xPoints);
  let maxX = Math.max(...xPoints);
  let minY = Math.min(...yPoints);
  let maxY = Math.max(...yPoints);
  let extendX = (maxX - minX) * (hitScale - 1.0) / 2;
  let extendY = (maxY - minY) * (hitScale - 1.0) / 2;
  minX -= extendX;
  maxX += extendX;
  minY -= extendY;
  maxY += extendY;
  // 最近傍plugが範囲内に入っていれば indexとそのplugを返す
  if (minX < x && x < maxX && minY < y && y < maxY) {
    return [nearestNodeIndex, nearestPlug];
  }
  // 外れの時は -1を二つ(indexとplug)返す
  return [-1, -1];
}
/**
 * add inputfilename when droped Frame hit any other counterpart
 * @param plug instance of outputfile
 * @param svg instance of svg.js
 * @param plug selector of output plug
 * @param hitIndex selector of frame node index
 * @param hitPlug selector of frame 
 * @param plug selector of output plug (e.g. '.receptorFrame')
 */
function autoAddFilePreCheck(svg, hitPlug, taskNodeID, taskBoxNode, filename, type) {
  // hitPlug check
  if (hitPlug == undefined || hitPlug.parent() == undefined) return [-1, -1];
  // task type check (expect "source" task)
  if (taskBoxNode.data('type') === "source") return [-1, -1];
  // connect stepjob to stepjob
  if (taskBoxNode.data('type') === "stepjobTask" && type === "stepjobTask") {
    showMessage("cannot connect stepjobTask to stepjobTask");
    return [-1, -1];
  }

  // deplicate check
  let addInputPlug = null;
  let receptorPlugs = svg.select(".receptorPlug");
  receptorPlugs.each(function (i, v) {
    let index = v[i].parent().node.instance.data('ID');
    if (index === taskNodeID && v[i].data('name') === filename) {
      addInputPlug = v[i];
      return true;  // 処理中断
    }
  });
  // exist same file name -> addInputPlug : task ID || else -> addInputPlug : null 
  return [taskNodeID, addInputPlug];
}

export class SvgCable {
  /**
   * @param svg instance of svg.js
   * @param color color of the cable
   * @param direction direction of the cable. DU(Down to Up) or RL(Right to Legt)
   * @param startX x coordinate of initial start point
   * @param startY y coordinate of initial start point
   * @param endtX x coordinate of initial end point
   * @param endtY y coordinate of initial end point
   */
  constructor(svg, color, direction, startX, startY, endX, endY) {
    this.tmpSvg = svg; //for debug calcControlPoint
    this.cable = svg.path('').fill('none').stroke({ color: color, width: config.box_appearance.strokeWidth });
    this.startX = startX;
    this.startY = startY;
    this.endX = endX || startX;
    this.endY = endY || startY;
    if (direction === 'DU' || direction === 'RL') {
      this.direction = direction;
    } else {
      console.log('illegal direction: ', direction);
    }
  }
  _calcControlPoint(sx, sy, ex, ey, boxBbox) {
    const scaleRange = 1.5;
    const scaleControlPoint = 1.8;
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    let cp1x = 0;
    let cp1y = 0;
    let cp2x = 0;
    let cp2y = 0;
    if (this.direction === 'DU') {
      const boxWidth = boxBbox.width;
      const offset = boxWidth * scaleControlPoint;
      if (ey < sy) {
        if (sx - boxWidth * scaleRange < ex && ex < sx + boxWidth * scaleRange) {
          if (sx > ex) {
            cp1x = sx + offset;
            cp1y = sy + offset;
            cp2x = ex + offset;
            cp2y = ey - offset;
          } else {
            cp1x = sx - offset;
            cp1y = sy + offset;
            cp2x = ex - offset;
            cp2y = ey - offset;
          }
        } else {
          cp1x = mx;
          cp1y = sy + offset;
          cp2x = mx;
          cp2y = ey - offset;
        }
      } else {
        cp1x = sx;
        cp1y = my;
        cp2x = ex;
        cp2y = my;
      }
    } else if (this.direction === 'RL') {
      const boxHeight = boxBbox.height;
      const offset = boxHeight * scaleControlPoint;
      if (ex < sx) {
        if (sy - boxHeight * scaleRange < ey && ey < sy + boxHeight * scaleRange) {
          cp1x = sx + offset;
          cp1y = sy - offset;
          cp2x = ex - offset;
          cp2y = ey - offset;
        } else {
          cp1x = sx + offset;
          cp1y = my;
          cp2x = ex - offset;
          cp2y = my;
        }
      } else {
        cp1x = mx;
        cp1y = sy;
        cp2x = mx;
        cp2y = ey;
      }
    }
    return [cp1x, cp1y, cp2x, cp2y];
  }
  _draw(sx, sy, ex, ey, boxBbox) {
    if (boxBbox == null) {
      boxBbox = this.cable.parent().node.instance.data('boxBbox');
    }
    const [cp1x, cp1y, cp2x, cp2y] = this._calcControlPoint(sx, sy, ex, ey, boxBbox);
    this.cable.plot(`M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`)
    // if (this.direction === 'DU') {
    //   // const t = 2 * Math.abs(Math.atan((ex - sx) / (ey - sy))) / Math.PI;
    //   // this.cable.plot(`M ${sx} ${sy} V ${t * sy + (1 - t) * ey} H ${ex} L ${ex} ${ey}`)
    //   this.cable.plot(`M ${sx} ${sy} V ${(sy + ey) / 2} H ${ex} L ${ex} ${ey}`)
    // } else {
    //   // const t = 2 * Math.abs(Math.atan((ey - sy) / (ex - sx))) / Math.PI;
    //   // this.cable.plot(`M ${sx} ${sy} H ${t * sx + (1 - t) * ex} V ${ey} L ${ex} ${ey}`)
    //   this.cable.plot(`M ${sx} ${sy} H ${(sx+ex) / 2} L ${ex} ${ey}`)
    // }
  }
  dragEndPoint(dx, dy, boxBbox) {
    this._draw(this.startX, this.startY, this.endX + dx, this.endY + dy, boxBbox);
  }
  dragStartPoint(dx, dy, boxBbox) {
    this._draw(this.startX + dx, this.startY + dy, this.endX, this.endY, boxBbox);
  }
  remove() {
    if (this.cable != null) this.cable.remove();
    this.cable = null;
  }
  changeCable() {
    this.cable.attr("stroke-dasharray", "4 4");
  }
}

class SvgBox {
  constructor(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host, useJobScheduler, updateOnDemand, disable, stepnum) {
    this.draw = svg;
    this.box = this.draw.group();
    this.type = type.toLowerCase();

    // read draw settings from config
    // upper parts (outerFrame)
    const titleHeight = config.box_appearance.titleHeight;
    const titleWidth = config.box_appearance.titleWidth;
    const opacity = config.box_appearance.opacity;

    // create inner parts
    const outerFrame = this.createOuterFrame(type, titleHeight, titleWidth);
    const innerFrame = this.createInnerFrame(titleHeight, titleWidth);
    const stepnumber = this.visualizeStepnum(type, stepnum)

    const output = this.createOutputText(outputFiles);
    const input = this.createInputText(inputFiles);

    const outputBBox = output.bbox();
    const inputBBox = input.bbox();
    const title = this.createTitle(name, disable);
    const iconImage = this.createIconImage(type, host, useJobScheduler);

    let fileBodyHeight = 0;
    if (type === 'source') {
      inputBBox.height = config.box_appearance.textHeightSize;
    } else if (type === 'viewer') {
      if (inputFiles.length === 1) {
        inputBBox.height = config.box_appearance.textHeightSize;
      }
      if (inputFiles.length > 1) {
        fileBodyHeight = config.box_appearance.bodyHeightOffset;
      }
    } else {
      if (Math.max(inputFiles.length, outputFiles.length) === 1) {
        inputBBox.height = config.box_appearance.textHeightSize;
        outputBBox.height = config.box_appearance.textHeightSize;
      }
      if (Math.max(inputFiles.length, outputFiles.length) > 1) {
        fileBodyHeight = config.box_appearance.bodyHeightOffset;
      }
    }

    const bodyHeight = titleHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height)) + fileBodyHeight;
    this.height = bodyHeight + titleHeight;

    let taskState;
    let repeatState;
    let whileState;
    if (type === "parameterStudy" || type === "for" || type === "foreach") {
      repeatState = this.createStateForRepeat(state, numTotal, numFinished, numFailed);
    } else if (type === "while") {
      whileState = this.createStateForWhile(state, numFinished, numFailed);
    } else {
      taskState = this.createState(state);
    }

    this.box
      .add(outerFrame)
      .add(innerFrame)
      .add(title)
      .add(input)
      .add(output)
      .add(stepnumber)
      .add(iconImage)
      .move(x, y)
      .style('cursor', 'default')
      .opacity(opacity)
      .addClass(`svg_${name}_box`);

    //子コンポーネントの表示
    if (typeof nodes !== "undefined") {
      if (nodes.length !== 0) {
        let nodePosYInfo = [];
        nodePosYInfo = this.getNodePosY(type, nodes);
        const nodesViewField = this.createNodesViewField(type, bodyHeight, nodes, nodePosYInfo);
        const nodesView = this.createNodes(type, bodyHeight, nodes);
        const nodesIconField = this.createNodesIconField(type, bodyHeight, nodes);
        this.box
          .add(nodesViewField)
          .add(nodesIconField)
          .add(nodesView);
      }
    }

    // add state info
    if (type === "parameterStudy" || type === "for" || type === "foreach") {
      for (var i = 0; i < repeatState.length; i++) {
        this.box.add(repeatState[i]);
      }
    } else if (type === "while") {
      for (var i = 0; i < whileState.length; i++) {
        this.box.add(whileState[i]);
      }
    } else {
      this.box.add(taskState);
    }

    innerFrame.size(titleWidth, bodyHeight);
  }
  /**
   * create outer frame
   * @return outer frame element
   */
  createOuterFrame(type, titleHeight, titleWidth) {
    const nodeColor = config.node_color[type];
    return this.draw
      .polygon([
        [0, 0],
        [titleWidth, 0],
        [titleWidth, titleHeight],
        [0, titleHeight],
      ])
      .fill(nodeColor);
  }
  /**
   * create inner frame
   * @return inner frame element
   */
  createInnerFrame(titleHeight, titleWidth) {
    return this.draw
      .polygon([
        [0, 0],
        [titleWidth, 0],
        [titleWidth, titleHeight],
        [0, titleHeight],
      ])
      .fill("rgba(68, 68, 73,0.5")
      .attr('class', 'titleFrame');
  }

  /**
   * optimize draw target letter
   * @param 
   * @param drawAbleWidth drawable Area  
   * @return draw letter
   */
  optimizeDrawLength(drawTarget, drawTargetWidth, drawAbleWidth) {
    // const drawTargetTmp = this.draw.text(drawTarget);
    // let drawTargetWidth = drawTargetTmp.bbox().width;
    let drawTargetLength = drawTarget.length;
    let fontSizePerOne = drawTargetWidth / drawTargetLength;
    let drawAbleTargetNum = Math.ceil(drawAbleWidth / Math.ceil(fontSizePerOne));
    let cutNameNum = drawTargetLength - drawAbleTargetNum + 1;
    let optimizedTarget = drawTarget.slice(0, -1 * cutNameNum);
    return optimizedTarget;
  }
  /**
   * create title
   * @return title element
   */
  createTitle(name, disable) {
    const titlePosY = 6;
    const titlePosX = 48;
    let fillColor = '#FFFFFF';
    if (disable === true) fillColor = '#FF0000';
    this.titleGroup = this.draw.group();
    // componet frame width = 256
    // state icon width(about) = 38
    const textTmp = this.draw.text(name);
    let titleWidth = textTmp.bbox().width;
    let title;
    if (titleWidth > config.box_appearance.titleLengthLimit) {
      title = this.optimizeDrawLength(name, titleWidth, config.box_appearance.titleLengthLimit);
      // display componet title = name + ...
      let epllisisDot = '...'
      const epllisis = this.draw
        .text(epllisisDot)
        .fill(fillColor)
        .x(config.box_appearance.titleEpllisisPosX)
        .y(config.box_appearance.titleEpllisisPosY)
        .addClass('componentTitle');
      this.titleGroup.add(epllisis);
    } else {
      title = name;
    }
    textTmp.remove();
    const text = this.draw
      .text(title)
      .fill(fillColor)
      .x(titlePosX)
      .y(titlePosY)
      .addClass('componentTitle');
    this.titleGroup.add(text);
    return this.titleGroup;
  }

  /**
 * visualize stepnum
 * @return stepnum element
 */
  visualizeStepnum(type, stepnum) {
    const posY = 0;
    const posX = 30;
    let strStepnum = stepnum + "";
    let fillColor = '#FFFFFF';
    if (type !== 'stepjobTask') {
      strStepnum = "";
    }
    return this.draw
      .text(strStepnum)
      .fill(fillColor)
      .x(posX)
      .y(posY);
  }

  /**
   * create output file text
   * @return output file text
   */
  createOutputText(outputFiles) {
    this.outputGroup = this.draw.group();
    if (outputFiles === undefined) {
      const text = this.draw
        .text("")
        .fill('#FFFFFF');
      text.move(0, 0);
      this.outputGroup.add(text);
    } else {
      outputFiles.forEach((output, index) => {
        let optimizedFlag = false;
        const outputtextTmp = this.draw.text(output.name);
        let outputtextWidth = outputtextTmp.bbox().width;
        let outputtext;
        if (outputtextWidth > config.box_appearance.textLengthLimit) {
          outputtext = this.optimizeDrawLength(output.name, outputtextWidth, config.box_appearance.textLengthLimit);
          optimizedFlag = true;
        } else {
          outputtext = output.name;
        }
        outputtextTmp.remove();

        const text = this.draw
          .text(outputtext || "")
          .fill('#FFFFFF');
        let x = config.box_appearance.titleWidth - text.bbox().width - config.box_appearance.outputTextOffset;
        this.textHeight = config.box_appearance.textHeightSize;
        const y = calcFileBasePosY() + this.textHeight * index;
        if (optimizedFlag !== false) {
          // display componet outputtext = outputtext + ...
          let epllisisDot = '...'
          const epllisis = this.draw
            .text(epllisisDot)
            .fill('#FFFFFF');
          let epllisisDotPosX = config.box_appearance.titleWidth - epllisis.bbox().width;
          let epllisisDotPosY = y - config.box_appearance.filenameHeightOffset;
          epllisis.x(epllisisDotPosX).y(epllisisDotPosY);
          this.outputGroup.add(epllisis);
          x += -config.box_appearance.epllisisSpace;
        }
        text.move(x, y);
        this.outputGroup.add(text);
      });
    }
    return this.outputGroup;
  }
  /**
   * create input file text
   * @return input file text
   */
  createInputText(inputFiles) {
    this.inputGroup = this.draw.group();
    if (inputFiles === undefined) {
      const text = this.draw
        .text("")
        .fill('#FFFFFF');
      text.move(0, 0);
      this.inputGroup.add(text);
    } else {
      inputFiles.forEach((input, index) => {
        let optimizedFlag = false;
        const inputtextTmp = this.draw.text(input.name);
        let inputtextWidth = inputtextTmp.bbox().width;
        let inputtext;
        if (inputtextWidth > config.box_appearance.textLengthLimit) {
          inputtext = this.optimizeDrawLength(input.name, inputtextWidth, config.box_appearance.textLengthLimit);
          optimizedFlag = true;
        } else {
          inputtext = input.name;
        }
        inputtextTmp.remove();

        const text = this.draw
          .text(inputtext || "")
          .fill('#FFFFFF');
        let x = config.box_appearance.inputTextOffset;
        this.textHeight = config.box_appearance.textHeightSize;
        const y = calcFileBasePosY() + this.textHeight * index;

        if (optimizedFlag !== false) {
          // display componet outputtext = outputtext + ...
          let epllisisDot = '...'
          const epllisis = this.draw
            .text(epllisisDot)
            .fill('#FFFFFF');
          let epllisisDotPosX = text.bbox().width + config.box_appearance.inputTextOffset + config.box_appearance.epllisisSpace;
          let epllisisDotPosY = y - config.box_appearance.filenameHeightOffset;
          epllisis.x(epllisisDotPosX).y(epllisisDotPosY);
          this.inputGroup.add(epllisis);
        }
        text.move(x, y);
        this.inputGroup.add(text);
      });
    }
    return this.inputGroup;
  }

  /**
 * create state
 * @return state element
 */

  createState(state) {
    const statePosX = 220;
    const statePosY = 0;
    if (state === 'stage-in' || state === 'waiting' || state === 'queued' || state === 'stage-out') {
      state = 'running'
    }
    const nodeStatePath = config.state_icon[state];
    return this.draw
      .image(nodeStatePath)
      .fill('#FFFFFF')
      .x(statePosX)
      .y(statePosY);
  }

  // 'PS, for, foreach' component
  createStateForRepeat(state, numTotal, numFinished, numFailed) {
    const statePosX = 220;
    const statePosY = 0;
    if (state === 'stage-in' || state === 'waiting' || state === 'queued' || state === 'stage-out') {
      state = 'running'
    }
    const nodeStatePath = config.state_icon[state];
    if (state === 'running' && !isNaN(numTotal)) {
      const calcProgress = numFinished / numTotal * 100;
      const calcProgress2 = numFailed / numTotal * 100;
      const radius = 7;
      const diameter = radius * 2;
      const circumference = 2.0 * radius * Math.PI;
      const startPosition = circumference * 0.25;
      const convertedPercentage = circumference * 0.01;
      let progress = convertedPercentage * calcProgress;
      let progress2 = convertedPercentage * calcProgress2;
      let progressTotal = progress + progress2;
      if (!isNaN(numFailed)) {
        return [
          this.draw
            .circle(`${diameter}`)
            .fill('rgba(0,0,0,0)')
            .stroke({ color: '#88BB00', width: `${diameter}`, dashoffset: `${startPosition}`, dasharray: `${progress},${circumference - progress}` })
            .x(statePosX + 11)
            .y(statePosY + 9),
          this.draw
            .circle(`${diameter}`)
            .fill('rgba(0,0,0,0)')
            .stroke({ color: '#E60000', width: `${diameter}`, dashoffset: `${startPosition + 1 - progress}`, dasharray: `${progress2},${circumference - progress2}` })
            .x(statePosX + 11)
            .y(statePosY + 9),
          this.draw
            .circle(`${diameter}`)
            .fill('rgba(0,0,0,0)')
            .stroke({ color: '#2F2F33', width: `${diameter}`, dashoffset: `${startPosition - progressTotal}`, dasharray: `${circumference - progressTotal},${progressTotal}` })
            .x(statePosX + 11)
            .y(statePosY + 9)
        ]
      } else {
        return [
          this.draw
            .circle(`${diameter}`)
            .fill('rgba(0,0,0,0)')
            .stroke({ color: '#88BB00', width: `${diameter}`, dashoffset: `${startPosition}`, dasharray: `${progress},${circumference - progress}` })
            .x(statePosX + 11)
            .y(statePosY + 9),
          this.draw
            .circle(`${diameter}`)
            .fill('rgba(0,0,0,0)')
            .stroke({ color: '#2F2F33', width: `${diameter}`, dashoffset: `${startPosition - progress}`, dasharray: `${circumference - progress},${progress}` })
            .x(statePosX + 11)
            .y(statePosY + 9)
        ]
      }
    } else {
      return [
        this.draw
          .image(nodeStatePath)
          .fill('#FFFFFF')
          .x(statePosX)
          .y(statePosY)
      ]
    }
  }

  // 'while' component
  createStateForWhile(state, numFinished, numFailed) {
    const statePosX = 220;
    const statePosY = 0;
    if (state === 'stage-in' || state === 'waiting' || state === 'queued' || state === 'stage-out') {
      state = 'running'
    }
    const nodeStatePath = config.state_icon[state];
    if (state === 'running' && !isNaN(numFinished)) {
      if (isNaN(numFailed)) {
        numFailed = 0;
      }
      let strFinishedNum = numFinished + "";
      let strFailedNum = numFailed + "";
      this.whileGroup = this.draw.group();

      const finishedText = this.draw
        .text(strFinishedNum)
        .fill('#FFFFFF')
        .addClass('whileProgress');
      let finishedTextWidth = finishedText.bbox().width;
      let finishedDx = 18 - finishedTextWidth / 2;
      finishedText.move(statePosX + finishedDx, statePosY - 1.8);
      this.whileGroup.add(finishedText);

      const failedText = this.draw
        .text(strFailedNum)
        .fill('red')
        .addClass('whileFailedProgress');
      let failedTextWidth = failedText.bbox().width;
      let failedDx = 18 - failedTextWidth / 2;
      failedText.move(statePosX + failedDx, statePosY + 14.3);
      this.whileGroup.add(failedText);

      return [
        this.draw
          .circle(14)
          .fill('rgba(0,0,0,0)')
          .stroke({ color: '#2F2F33', width: 14 })
          .x(statePosX + 11)
          .y(statePosY + 9),
        this.whileGroup
      ]
    } else {
      return [
        this.draw
          .image(nodeStatePath)
          .fill('#FFFFFF')
          .x(statePosX)
          .y(statePosY)
      ]
    }
  }

  /**
 * create workflow component icon
 * @return icon
 */
  createIconImage(type, host, useJobScheduler) {
    //左隅に作成
    if (type === "task") {
      if (host === "localhost") {
        if (useJobScheduler === true) {
          type = 'taskAndUsejobscheluler';
        } else {
          type = 'task';
        }
      } else {
        if (useJobScheduler === true) {
          type = 'remotetaskAndUsejobscheluler';
        } else {
          type = 'remotetask';
        }
      }
    }
    const statePosX = 8;
    const statePosY = 0;
    const nodeIconPath = config.node_icon[type];
    return this.draw
      .image(nodeIconPath)
      .fill('#111')
      .x(statePosX)
      .y(statePosY);
  }

  /**
 * create children view field
 * @return view field
 */
  getNodePosY(type, nodes) {
    let nodePosYArray = [];
    let nodePosYInfo = [];
    if (nodes.length > 0) {
      nodes.forEach((node, index) => {
        if (node === null) {
          return;
        } else {
          nodePosYArray.push(node.pos.y);
        }
      });
    }
    let maxPosY = Math.max.apply(null, nodePosYArray);
    let minPosY = Math.min.apply(null, nodePosYArray);
    nodePosYInfo.push(maxPosY);
    nodePosYInfo.push(minPosY);
    return nodePosYInfo;
  }

  /**
 * create children view field
 * @return view field
 */
  createNodesViewField(type, bodyHeight, nodes, nodesPosInfo) {
    this.fieldGroup = this.draw.group();
    let viewFlag = false;
    nodes.forEach((node, index) => {
      if (node === null) {
        return;
      } else {
        viewFlag = true;
      }
    });

    if (viewFlag === true) {
      const iconSize = 24;
      const headerHeight = 110;
      let viewHeight = nodesPosInfo[0] / 5 + iconSize * 1.5;
      const nodeColor = "rgba(68, 68, 73, 0.5)";
      const field = this.draw
        .polygon([
          [0, 0],
          [config.box_appearance.titleWidth, 0],
          [config.box_appearance.titleWidth, viewHeight],
          [0, viewHeight],
        ])
        .attr('class', 'viewNodesField')
        .stroke("#2F2F33")
        .fill(nodeColor);
      const y = bodyHeight + 1;
      field.move(0, y);
      this.fieldGroup.add(field);
    }
    return this.fieldGroup;
  }

  /**
   * create nodes
   * @return nodes
   */
  createNodes(type, bodyHeight, nodes) {
    this.nodeGroup = this.draw.group();
    let nodePosYArray = [];
    nodes.forEach((node, index) => {
      if (node === null) return;
      nodePosYArray.push(node.pos.y);
      const nodeColor = config.node_color[node.type];
      let nodetype = node.type
      if (nodetype === "task") {
        if (node.host === "localhost") {
          if (node.useJobScheduler === true) {
            nodetype = 'taskAndUsejobscheluler';
          } else {
            nodetype = 'task';
          }
        } else {
          if (node.useJobScheduler === true) {
            nodetype = 'remotetaskAndUsejobscheluler';
          } else {
            nodetype = 'remotetask';
          }
        }
      }
      const nodeIconPath = config.node_icon[nodetype];
      const nodePosX = node.pos.x / 5;
      let nodePosY = node.pos.y / 5;
      if (node.pos.y < 0) {
        nodePosY = 0;
      }
      const correctNodeIconPath = nodeIconPath.replace(".png", "_p.png");
      const img = this.draw
        .image(correctNodeIconPath)
        .attr('class', 'viewNodes')
        .fill(nodeColor);
      let x = nodePosX;
      const y = nodePosY + bodyHeight;
      const iconSize = 24;
      const childrenViewAreaWidthLimit = config.box_appearance.titleWidth - iconSize;
      if (x < 0) {
        x = 0;
      } else if (x > childrenViewAreaWidthLimit) {
        x = childrenViewAreaWidthLimit;
      }
      img.move(x, y);
      this.nodeGroup.add(img);
    });
    return this.nodeGroup;
  }

  /**
   * create children icon field
   * @return button field
   */
  createNodesIconField(type, bodyHeight, nodes) {
    this.iconFieldGroup = this.draw.group();
    nodes.forEach((node, index) => {
      if (node === null) return;

      const iconFieldHeight = 24;
      const iconTitlewidth = 24;
      const nodeColor = config.node_color[node.type];
      const nodePosX = node.pos.x / 5;
      let nodePosY = node.pos.y / 5;
      if (node.pos.y < 0) {
        nodePosY = 0;
      }
      const iconField = this.draw
        .polygon([
          [0, 0],
          [iconTitlewidth, 0],
          [iconTitlewidth, iconFieldHeight],
          [0, iconFieldHeight],
        ])
        .fill(nodeColor)
        .attr('class', 'viewNodes');
      let x = nodePosX;
      const y = nodePosY + bodyHeight;
      const iconSize = 24;
      const childrenViewAreaWidthLimit = config.box_appearance.titleWidth - iconSize;
      if (x < 0) {
        x = 0;
      } else if (x > childrenViewAreaWidthLimit) {
        x = childrenViewAreaWidthLimit;
      }
      iconField.move(x, y);
      this.iconFieldGroup.add(iconField);
    });
    return this.iconFieldGroup;
  }
}

class SvgParentFilesBox {
  constructor(svg, x, y, type, name, inputFiles, outputFiles) {
    this.draw = svg;
    this.type = type.toLowerCase();

    const titleHeight = config.box_appearance.titleHeight;
    const titleWidth = config.box_appearance.titleWidth;
    const opacity = config.box_appearance.opacity;
    const outputTextOffset = config.box_appearance.outputTextOffset;

    const input = this.createInputText(inputFiles);
    const output = this.createOutputText(outputFiles);
    const inputBBox = input.bbox();
    const outputBBox = output.bbox();
    const bodyHeight = titleHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));

    this.height = bodyHeight + titleHeight;
    this.box = this.draw.group();
    this.box
      .add(input)
      .add(output)
      .move(x, y)
      .style('cursor', 'default')
      .opacity(opacity);
    // .addClass('box');
  }

  /**
   * optimize draw target letter
   * @param 
   * @param drawAbleWidth drawable Area  
   * @return draw letter
   */
  optimizeDrawLength(drawTarget, drawTargetWidth, drawAbleWidth) {
    // const drawTargetTmp = this.draw.text(drawTarget);
    // let drawTargetWidth = drawTargetTmp.bbox().width;
    let drawTargetLength = drawTarget.length;
    let fontSizePerOne = drawTargetWidth / drawTargetLength;
    let drawAbleTargetNum = Math.ceil(drawAbleWidth / Math.ceil(fontSizePerOne));
    let cutNameNum = drawTargetLength - drawAbleTargetNum + 1;
    let optimizedTarget = drawTarget.slice(0, -1 * cutNameNum);
    return optimizedTarget;
  }

  /**
   * create output file text
   * @return output file text
   */
  createOutputText(outputFiles) {
    this.outputGroup = this.draw.group();
    outputFiles.forEach((output, index) => {

      let optimizedFlag = false;
      const outputtextTmp = this.draw.text(output.name);
      let outputtextWidth = outputtextTmp.bbox().width;
      let outputtext;
      if (outputtextWidth > config.parentChildfileConnect.textLengthLimit) {
        outputtext = this.optimizeDrawLength(output.name, outputtextWidth, config.parentChildfileConnect.textLengthLimit);
        optimizedFlag = true;
      } else {
        outputtext = output.name;
      }
      outputtextTmp.remove();

      const text = this.draw
        .text(outputtext || "")
        .fill('#FFFFFF');
      const connectorInterval = config.parentChildfileConnect.connectorHeight * 1.5;
      let x = config.parentChildfileConnect.defaltConnectorPosX - text.bbox().width - config.box_appearance.outputTextOffset;
      const y = config.parentChildfileConnect.connectorHeight + config.parentChildfileConnect.connectorMiddlePosY + connectorInterval * index;

      if (optimizedFlag !== false) {
        // display componet outputtext = outputtext + ...
        let epllisisDot = '...'
        const epllisis = this.draw
          .text(epllisisDot)
          .fill('#FFFFFF');
        let epllisisDotPosX = config.box_appearance.titleWidth - epllisis.bbox().width - config.parentChildfileConnect.connectorEpllisisPosX;
        let epllisisDotPosY = y - config.box_appearance.filenameHeightOffset;
        epllisis.x(epllisisDotPosX).y(epllisisDotPosY);
        this.outputGroup.add(epllisis);
        x += -config.box_appearance.epllisisSpace - config.parentChildfileConnect.connectorEpllisisPosX * 0.5;
      }

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
      let optimizedFlag = false;
      const inputtextTmp = this.draw.text(input.name);
      let inputtextWidth = inputtextTmp.bbox().width;
      let inputtext;
      if (inputtextWidth > config.parentChildfileConnect.textLengthLimit) {
        inputtext = this.optimizeDrawLength(input.name, inputtextWidth, config.parentChildfileConnect.textLengthLimit);
        optimizedFlag = true;
      } else {
        inputtext = input.name;
      }
      inputtextTmp.remove();
      const text = this.draw
        .text(inputtext || "")
        .fill('#FFFFFF');
      const recepterInterval = config.parentChildfileConnect.recepterHeight * 1.5;
      const x = window.innerWidth - config.parentChildfileConnect.propertyAreaWidth;
      const y = window.innerHeight - config.parentChildfileConnect.defaltRecepterPosY + config.parentChildfileConnect.recepterHeight + config.parentChildfileConnect.connectorMiddlePosY + recepterInterval * index;

      if (optimizedFlag !== false) {
        // display componet outputtext = outputtext + ...
        let epllisisDot = '...'
        const epllisis = this.draw
          .text(epllisisDot)
          .fill('#FFFFFF');
        let epllisisDotPosX = window.innerWidth - config.parentChildfileConnect.recepterEpllisisOffsetPosX;
        let epllisisDotPosY = y - config.box_appearance.filenameHeightOffset;
        epllisis.x(epllisisDotPosX).y(epllisisDotPosY);
        this.inputGroup.add(epllisis);
      }
      text.move(x, y);
      this.inputGroup.add(text);
    });
    return this.inputGroup;
  }
}

function initializeCableInfo(cable, plug, clone, originX, originY) {
  cable.dragEndPoint(0, 0);
  plug.move(originX, originY);
  clone.remove();
}

//plug
function createLCPlugAndCable(svg, originX, originY, moveY, color, plugShape, cableDirection, counterpart, type, parent, sio, callback) {
  let plug = svg.polygon(plugShape).fill(color).addClass('connectorPlug');
  const bbox = plug.bbox();
  // lower case
  if (moveY) originX -= bbox.width / 2;
  plug.move(originX, originY).draggable();
  const cable = new SvgCable(svg, color, cableDirection, originX + bbox.width / 2, originY + bbox.height / 2);
  let clone = null;
  let dragStartPointX = null;
  let dragStartPointY = null;
  plug
    .on('dragstart', (e) => {
      if (cableDirection === 'RL' && plug.data('name') === "") {
        showMessage("please set outputFile before connect action");
      }
      console.log("start");
      var editDisable = plug.node.instance.data('edit_disable');
      if (editDisable === undefined || editDisable === false) {
        clone = plug.clone();
        dragStartPointX = e.detail.p.x;
        dragStartPointY = e.detail.p.y;
      } else {
        e.preventDefault();
      }
    })
    .on('dragmove', (e) => {
      if (cableDirection === 'RL' && plug.data('name') === "") {
        e.preventDefault();
        return false;
      }
      var editDisable = plug.node.instance.data('edit_disable');
      if (editDisable === undefined || editDisable === false) {
        let dx = e.detail.p.x - dragStartPointX;
        let dy = e.detail.p.y - dragStartPointY;
        cable.dragEndPoint(dx, dy);
      } else {
        e.preventDefault();
      }
    })
    .on('dragend', (e) => {
      var editDisable = plug.node.instance.data('edit_disable');
      if (editDisable === undefined || editDisable === false) {
        const dragEndPosX = e.target.instance.x();
        const dragEndPosY = e.target.instance.y();
        let [hitIndex, hitPlug] = collisionDetection(svg, counterpart, dragEndPosX, dragEndPosY, config.box_appearance.plug_drop_area_scale);
        // recepter, upperとの衝突なし
        if (hitIndex === -1) {
          // recepterの場合、titleFrameとの衝突を確認し、自動追加対象かチェックする
          if (counterpart === ".receptorPlug") {
            [hitIndex, hitPlug] = collisionDetectionFrame(svg, '.titleFrame', dragEndPosX, dragEndPosY, 1.0);
            // titleFrameとの衝突あり
            if (hitIndex !== -1) {
              const box = hitPlug.parent();
              const taskBoxNode = box.parent();
              const taskNodeID = taskBoxNode.data('ID');
              const filename = plug.data('name');
              [hitIndex, hitPlug] = autoAddFilePreCheck(svg, hitPlug, taskNodeID, taskBoxNode, filename, type);
              if (hitIndex === -1 && hitPlug === -1) {
                initializeCableInfo(cable, plug, clone, originX, originY);
                console.log("not connect:precheck failed");
                return;
              }
              // 同名ファイルが存在しないため、recepterを作成する
              if (hitPlug === null) {
                sio.emit('addInputFile', taskNodeID, filename, (result) => {
                  if (result) {
                    let addInputPlug = null;
                    addInputPlug = createReceptor(svg, box.x(), box.y(), 0, 10);
                    addInputPlug.data({ "ID": taskBoxNode.data('ID'), "name": filename, "type": type }).attr('id', `${taskBoxNode.name}_${filename}_receptor`);
                    plug.parent().add(addInputPlug);
                    if (addInputPlug !== null) {
                      [hitIndex, hitPlug] = [taskNodeID, addInputPlug];
                    }
                    const myIndex = plug.parent().node.instance.data('ID');
                    if (hitIndex !== myIndex) {
                      callback(myIndex, hitIndex, plug, hitPlug);
                    }
                    initializeCableInfo(cable, plug, clone, originX, originY);
                    console.log("connect:auto add inputfile");
                  } else {
                    initializeCableInfo(cable, plug, clone, originX, originY);
                    console.log("not connect:addInputFileAPI false");
                    return;
                  }
                });
              } else {
                //同名ファイルが存在する場合、線をつなぐ
                let myIndex;
                if (parent === true) {
                  myIndex = "parent";
                } else {
                  myIndex = plug.parent().node.instance.data('ID');
                }
                if (hitIndex !== myIndex) {
                  callback(myIndex, hitIndex, plug, hitPlug);
                }
                initializeCableInfo(cable, plug, clone, originX, originY);
                console.log("connect:exsit same name");
              }
            } else {
              // titleFrameにhitしない場合
              initializeCableInfo(cable, plug, clone, originX, originY);
              console.log("not connect:doesn't hit titleFrame");
              return;
            }
          } else {
            // 接続対象がupper
            initializeCableInfo(cable, plug, clone, originX, originY);
            console.log("not connect:connect target 'upper'");
            return;
          }
        } else {
          if (hitPlug.data('type') === 'stepjobTask' && type === 'stepjobTask') {
            initializeCableInfo(cable, plug, clone, originX, originY);
            showMessage("cannot connect stepjobTask to stepjobTask");
            console.log("not connect:cannot connect stepjobTask to stepjobTask");
            return;
          }
          // 通常のファイル接続の場合
          if (counterpart === ".receptorPlug") {
            const targetFile = plug.data('name');;
            const srcFiles = hitPlug.data('src');
            const dstName = hitPlug.data('name');
            if (srcFiles.length > 0 && !(dstName[dstName.length - 1] === "/" || dstName[dstName.length - 1] === "\\")) {
              initializeCableInfo(cable, plug, clone, originX, originY);
              showMessage(`cannot connect '${targetFile}' to '${dstName}'.</br>'${dstName}' data type is 'file'.`);
              console.log("not connect:files to file");
              return;
            }
          }
          const myIndex = plug.parent().node.instance.data('ID');
          if (hitIndex !== myIndex) {
            if (type === 'stepjobTask') {
              sio.emit('updateStepNumber');
            }
            callback(myIndex, hitIndex, plug, hitPlug);
          }
          initializeCableInfo(cable, plug, clone, originX, originY);
          console.log("normal connect");
        }
      } else {
        e.preventDefault();
      }
    });
  return [plug, cable.cable];
}

export function createLower(svg, originX, originY, offsetX, offsetY, color, sio, type) {
  return createLCPlugAndCable(svg, originX + offsetX, originY + offsetY, true, color, DPlug, 'DU', '.upperPlug', type, false, sio, function (myIndex, hitIndex, plug) {
    sio.emit('addLink', { src: myIndex, dst: hitIndex, isElse: plug.hasClass('elsePlug') });
  });
}

export function createConnector(svg, originX, originY, offsetX, offsetY, sio, type) {
  offsetY += calcFileBasePosY();
  return createLCPlugAndCable(svg, originX + offsetX, originY + offsetY, false, config.plug_color.file, RPlug, 'RL', '.receptorPlug', type, false, sio, function (myIndex, hitIndex, plug, hitPlug) {
    let srcName = plug.data('name');
    let dstName = hitPlug.data('name');
    sio.emit('addFileLink', myIndex, srcName, hitIndex, dstName);
  });
}

export function createReceptor(svg, originX, originY, offsetX, offsetY) {
  const plug = svg.polygon(LPlug).fill(config.plug_color.file).addClass('receptorPlug');
  const bbox = plug.bbox();
  plug.move(originX + offsetX - bbox.width, originY + offsetY + calcFileBasePosY());
  return plug;
}

export function createUpper(svg, originX, originY, offsetX, offsetY) {
  const plug = svg.polygon(UPlug).fill(config.plug_color.flow).addClass('upperPlug');
  const bbox = plug.bbox();
  plug.move(originX + offsetX - bbox.width / 2, originY + offsetY - bbox.height);
  return plug;
}

export function createBox(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host, useJobScheduler, updateOnDemand, disable, stepnum) {
  // class titleFrame
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host, useJobScheduler, updateOnDemand, disable, stepnum);
  return [box.box, box.textHeight];
}

//parent - children relation 
export function createFilesNameBox(svg, x, y, type, name, inputFiles, outputFiles) {
  const box = new SvgParentFilesBox(svg, x, y, type, name, inputFiles, outputFiles);
  return [box.box, box.textHeight];
}

//parent -> children connector
export function createParentConnector(svg, originX, originY, offsetX, offsetY, sio, type) {
  return createLCPlugAndCable(svg, originX + offsetX, originY + offsetY, false, config.plug_color.file, parentLPlug, 'RL', '.receptorPlug', type, true, sio, function (myIndex, hitIndex, plug, hitPlug) {
    let srcName = plug.data('name');
    let dstName = hitPlug.data('name');
    sio.emit('addFileLink', myIndex, srcName, hitIndex, dstName);
  });
}

//children -> parent connector
export function createParentReceptor(svg, originX, originY, offsetX, offsetY) {
  const plug = svg.polygon(parentRPlug).fill(config.plug_color.file).addClass('receptorPlug');
  const bbox = plug.bbox();
  plug.move(originX + offsetX, originY + offsetY + calcFileBasePosY());
  return plug;
}
