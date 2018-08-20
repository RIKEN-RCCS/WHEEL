import config from './config';
import '../css/workflow.css';

let UPlug = [[0, 0], [20, 0], [20, 8], [0, 8]];
let DPlug = [[0, 0], [20, 0], [10, 12]];
let LPlug = [[0, 0], [8, 0], [8, 16], [0, 16]];
let RPlug = [[0, 0], [8, 8], [0, 16]];
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
  const titleHeight = config.box_appearance.titleHeight;
  return titleHeight;
  //const marginHeight = config.box_appearance.marginHeight;
  //return titleHeight + marginHeight / 2;
}

/**
 * check if droped plug hit any other counterpart
 * @param svg instance of svg.js
 * @param counterpart selector of counterpart (e.g. '.upperPlut', '.receptorPlug')
 * @param x x coordinate of the point which will be checked
 * @param y y coordinate of the point which will be checked
 */
function collisionDetection(svg, counterpart, x, y) {
  let minDistance2 = Number.MAX_VALUE;
  let nearestNodeIndex = -1;
  let nearestPlugPoints = null;
  let nearestPlug = null;
  // dropしたplugと対応する種類のplugのうち最も距離が近いものを探す
  svg.select(counterpart).each(function (i, v) {
    let index = v[i].parent().node.instance.data('index');
    let points = v[i].node.points;
    const connectorWidth = 16;
    const connectorHeight = 32;
    let connectorCenterXpos = x + connectorWidth * 0.5;
    let connectorCenterYpos = y + connectorHeight * 0.5;
    let targetX = (points[0].x + points[1].x) * 0.5;
    let targetY = (points[0].y + points[3].y) * 0.5;
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
  });
  // 最近傍plugの頂点座標から当たり領域を作成
  let xPoints = Array.from(nearestPlugPoints).map((p) => {
    return p.x;
  });
  let yPoints = Array.from(nearestPlugPoints).map((p) => {
    return p.y;
  });
  let minX = Math.min(...xPoints);
  let maxX = Math.max(...xPoints);
  let minY = Math.min(...yPoints);
  let maxY = Math.max(...yPoints);
  let extendX = (maxX - minX) * (config.box_appearance.plug_drop_area_scale - 1.0) / 2;
  let extendY = (maxY - minY) * (config.box_appearance.plug_drop_area_scale - 1.0) / 2;
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
}

class SvgBox {
  constructor(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host) {
    this.draw = svg;
    this.type = type.toLowerCase();

    // read draw settings from config
    // upper parts (outerFrame)
    const titleHeight = config.box_appearance.titleHeight;
    const titleWidth = config.box_appearance.titleWidth;
    const opacity = config.box_appearance.opacity;

    // create inner parts
    const input = this.createInputText(inputFiles);
    const output = this.createOutputText(outputFiles);

    const outputBBox = output.bbox();
    const inputBBox = input.bbox();

    const bodyHeight = titleHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));

    this.height = bodyHeight + titleHeight;

    const title = this.createTitle(name);
    const iconImage = this.createIconImage(type, host);
    const taskState = this.createState(type, state, numTotal, numFinished, numFailed);

    //子コンポーネントの表示
    let nodePosYInfo = [];
    nodePosYInfo = this.getNodePosY(type, nodes);
    const nodesViewField = this.createNodesViewField(type, bodyHeight, nodes, nodePosYInfo);
    const nodesView = this.createNodes(type, bodyHeight, nodes);
    const nodesIconField = this.createNodesIconField(type, bodyHeight, nodes);


    this.width = 256; //画面デザイン上256pxとする

    const outerFrame = this.createOuterFrame(type);
    const innerFrame = this.createInnerFrame();

    this.box = this.draw.group();
    this.box
      .add(outerFrame)
      .add(innerFrame)
      .add(title)
      .add(input)
      .add(output)
      .add(taskState)
      .add(iconImage)
      .add(nodesViewField)
      .add(nodesIconField)
      .add(nodesView)
      .move(x, y)
      .style('cursor', 'default')
      .opacity(opacity)
      .addClass('box');

    // adjust size
    output.x(titleWidth);

    innerFrame.size(titleWidth, bodyHeight);

  }

  /**
   * create outer frame
   * @return outer frame element
   */
  createOuterFrame(type) {
    const titleHeight = 32;
    const titlewidth = 256;
    const nodeColor = config.node_color[type];
    return this.draw
      .polygon([
        [0, 0],
        [titlewidth, 0],
        [titlewidth, titleHeight],
        [0, titleHeight],
      ])
      .fill(nodeColor);
  }
  /**
   * create inner frame
   * @return inner frame element
   */
  createInnerFrame() {
    const titleHeight = 32;
    const titleWidth = 256;

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
   * create title
   * @return title element
   */
  createTitle(name) {
    const titlePosY = 6;
    const titlePosX = 48;
    return this.draw
      .text(name)
      .fill('#FFFFFF')
      .x(titlePosX)
      .y(titlePosY);
  }

  /**
   * create output file text
   * @return output file text
   */
  createOutputText(outputFiles) {
    this.outputGroup = this.draw.group();
    outputFiles.forEach((output, index) => {
      const text = this.draw
        .text(output.name || "")
        .fill('#FFFFFF');
      this.textHeight = text.bbox().height * config.box_appearance.textHeightScale;

      const x = -text.bbox().width - config.box_appearance.outputTextOffset;
      const y = calcFileBasePosY() + this.textHeight * index;
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
        .text(input.name || "")
        .fill('#FFFFFF');
      //this.textHeight = text.bbox().height * config.box_appearance.textHeightScale;
      this.textHeight = 24;
      const x = config.box_appearance.inputTextNamePosX;
      const y = 32 + this.textHeight * index;
      text.move(x, y);
      this.inputGroup.add(text);
    });
    return this.inputGroup;
  }

  /**
 * create state
 * @return state element
 */
  createState(type, state, numTotal, numFinished, numFailed) {
    const statePosX = 220;
    const statePosY = 0;
    const paraStuPosX = 120;
    if (state === 'stage-in' || state === 'waiting' || state === 'queued' || state === 'stage-out') {
      state = 'running'
    }
    const nodeStatePath = config.state_icon[state];
    const paraStuState = "Fin:" + numFinished + "Fail:" + numFailed + "(" + numTotal + ")";
    if (type === 'parameterStudy' && state === 'running') {
      const calcProgress = (numFinished + numFailed) / numTotal * 100;
      const radius = 7;
      const diameter = radius * 2;
      const circumference = 2.0 * radius * Math.PI;
      const startPosition = circumference * 0.25;
      const convertedPercentage = circumference * 0.01;
      let progress = convertedPercentage * calcProgress;
      return this.draw
        // .text(paraStuState)
        // .fill('#FFFFFF')
        // .x(paraStuPosX)
        // .y(statePosY);
        .circle(`${diameter}`)
        .fill('rgba(0,0,0,0)')
        .stroke({ color: '#88BB00', width: `${diameter}`, dashoffset: `${startPosition}`, dasharray: `${progress},${circumference - progress}` })
        .x(statePosX + 11)
        .y(statePosY + 9)
        .addClass('psProgress');
    } else {
      return this.draw
        .image(nodeStatePath)
        .fill('#FFFFFF')
        .x(statePosX)
        .y(statePosY);

    }
  }

  /**
 * create workflow component icon
 * @return icon
 */
  createIconImage(type, host) {
    //左隅に作成
    if (type === "task" && host !== "localhost") {
      type = 'remotetask'
    }
    console.log(type);
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
    if (type === 'workflow' || type === 'parameterStudy' || type === 'for' || type === 'while' || type === 'foreach') {

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
      console.log(nodePosYInfo);
    }
    return nodePosYInfo;
  }

  /**
 * create children view field
 * @return view field
 */
  createNodesViewField(type, bodyHeight, nodes, nodesPosInfo) {
    this.fieldGroup = this.draw.group();
    if (type === 'workflow' || type === 'parameterStudy' || type === 'for' || type === 'while' || type === 'foreach') {
      if (nodes.length > 0) {
        let viewFlag = false;
        nodes.forEach((node, index) => {
          if (node === null) {
            return;
          } else {
            viewFlag = true;
          }
        });

        if (viewFlag === true) {
          // 子コンポート最小のy座標 + 子コンポーネントのy座標幅
          // = nodesPosInfo[1] + nodesPosInfo[0] - nodesPosInfo[1] = nodesPosInfo[0]
          // 48 = アイコンの縦幅(24)+ゆとり幅(24)
          const titleHeight = nodesPosInfo[0] / 5 + 48;
          const titlewidth = 256;
          const nodeColor = "rgba(68, 68, 73, 0.5)";
          const field = this.draw
            .polygon([
              [0, 0],
              [titlewidth, 0],
              [titlewidth, titleHeight],
              [0, titleHeight],
            ])
            .attr('class', 'viewNodesField')
            .stroke("#2F2F33")
            .fill(nodeColor);
          const y = bodyHeight + 1;
          field.move(0, y);
          this.fieldGroup.add(field);
        }
      }
    }
    return this.fieldGroup;
  }

  /**
   * create nodes
   * @return nodes
   */
  createNodes(type, bodyHeight, nodes) {
    this.nodeGroup = this.draw.group();
    if (type === 'workflow' || type === 'parameterStudy' || type === 'for' || type === 'while' || type === 'foreach') {
      let nodePosYArray = [];
      nodes.forEach((node, index) => {
        if (node === null) return;
        nodePosYArray.push(node.pos.y);
        const nodeColor = config.node_color[node.type];
        const nodeIconPath = config.node_icon[node.type];
        const nodePosX = node.pos.x / 5;
        const nodePosY = node.pos.y / 5;
        const correctNodeIconPath = nodeIconPath.replace(".png", "_p.png");
        const img = this.draw
          .image(correctNodeIconPath)
          .attr('class', 'viewNodes')
          .fill(nodeColor);
        const x = nodePosX;
        const y = nodePosY + bodyHeight;

        if (x > 232 || y > 134 + bodyHeight) {
          if (x > 232 && y < 134 + bodyHeight) {
            img.move(232, y);
          }
          if (x < 232 && y > 134 + bodyHeight) {
            img.move(x, 134 + bodyHeight);
          }
          if (x > 232 && y > 134 + bodyHeight) {
            img.move(232, 134 + bodyHeight);
          }
        } else {
          img.move(x, y);
        }
        this.nodeGroup.add(img);

      });
    }
    return this.nodeGroup;
  }

  /**
   * create children icon field
   * @return button field
   */
  createNodesIconField(type, bodyHeight, nodes) {
    this.iconFieldGroup = this.draw.group();
    if (type === 'workflow' || type === 'parameterStudy' || type === 'for' || type === 'while' || type === 'foreach') {
      nodes.forEach((node, index) => {
        if (node === null) return;

        const iconFieldHeight = 24;
        const iconTitlewidth = 24;
        const nodeColor = config.node_color[node.type];
        const nodePosX = node.pos.x / 5;
        const nodePosY = node.pos.y / 5;
        const iconField = this.draw
          .polygon([
            [0, 0],
            [iconTitlewidth, 0],
            [iconTitlewidth, iconFieldHeight],
            [0, iconFieldHeight],
          ])
          .fill(nodeColor)
          .attr('class', 'viewNodes');
        const x = nodePosX;
        const y = nodePosY + bodyHeight;
        if (x > 232 || y > 134 + bodyHeight) {
          if (x > 232 && y < 134 + bodyHeight) {
            iconField.move(232, y);
          }
          if (x < 232 && y > 134 + bodyHeight) {
            iconField.move(x, 134 + bodyHeight);
          }
          if (x > 232 && y > 134 + bodyHeight) {
            iconField.move(232, 134 + bodyHeight);
          }
        } else {
          iconField.move(x, y);
        }
        this.fieldGroup.add(iconField);
      });
    }
    return this.fieldGroup;
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

    const outputBBox = output.bbox();
    const inputBBox = input.bbox();

    const bodyHeight = titleHeight + Math.ceil(Math.max(inputBBox.height, outputBBox.height));

    this.height = bodyHeight + titleHeight;
    this.width = 256;

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
   * create output file text
   * @return output file text
   */
  createOutputText(outputFiles) {
    this.outputGroup = this.draw.group();
    outputFiles.forEach((output, index) => {
      const text = this.draw
        .text(output.name || "")
        .fill('#FFFFFF');
      let outputFileNameLength = output.name.length;
      console.log(outputFileNameLength);
      const connectorHeight = 32;
      const connectorInterval = connectorHeight * 1.5;
      // 240 = connectorの位置
      // 6.1 = 一文字あたりの文字の大きさ
      const x = 240 - 8 - outputFileNameLength * 6.1;
      // 5.6 = connectorの中間位置表示用
      const y = connectorHeight + 5.6 + connectorInterval * index;

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
        .text(input.name || "")
        .fill('#FFFFFF');
      const recepterHeight = 32;
      const recepterInterval = recepterHeight * 1.5;
      const x = window.innerWidth - 248;
      const y = window.innerHeight - 361 + 32 + 5.6 + recepterInterval * index;
      console.log(window.innerHeight);

      text.move(x, y);
      this.inputGroup.add(text);
    });
    return this.inputGroup;
  }


}

//plug
function createLCPlugAndCable(svg, originX, originY, moveY, color, plugShape, cableDirection, counterpart, callback) {
  //plugの位置（originX,originY）を決める
  let plug = svg.polygon(plugShape).fill(color);
  const bbox = plug.bbox();
  //originX -= bbox.width / 2; RPlugは影響なし 
  if (moveY) originX -= bbox.width / 2;//lowerのとき
  //if (moveY) originY -= bbox.height / 2; RPlugは影響なし 
  plug.move(originX, originY).draggable();
  const cable = new SvgCable(svg, color, cableDirection, originX + bbox.width / 2, originY + bbox.height / 2);
  let firstTime = true;
  let clone = null;
  let dragStartPointX = null;
  let dragStartPointY = null;
  plug
    .on('dragstart', (e) => {
      if (firstTime) {
        clone = plug.clone();
        firstTime = false;
      }
      dragStartPointX = e.detail.p.x;
      dragStartPointY = e.detail.p.y;
    })
    .on('dragmove', (e) => {
      let dx = e.detail.p.x - dragStartPointX;
      let dy = e.detail.p.y - dragStartPointY;
      cable.dragEndPoint(dx, dy);
    })
    .on('dragend', (e) => {
      cable.endX = e.target.instance.x();
      cable.endY = e.target.instance.y();
      const [hitIndex, hitPlug] = collisionDetection(svg, counterpart, cable.endX, cable.endY);
      if (hitIndex === -1) {
        cable.remove();
        plug.remove();
        plug = clone
        console.log("not connect");
        return;
      }
      const myIndex = plug.parent().node.instance.data('index');
      if (hitIndex !== myIndex) {
        callback(myIndex, hitIndex, plug, hitPlug);
      }
      cable.remove();
      plug.remove();
      plug = clone
    });
  return [plug, cable.cable];
}

function createParentCPlugAndCable(svg, originX, originY, moveY, color, plugShape, cableDirection, counterpart, callback) {
  //plugの位置（originX,originY）を決める
  let plug = svg.polygon(plugShape).fill(color);
  const bbox = plug.bbox();
  if (moveY) originX -= bbox.width / 2;
  plug.move(originX, originY).draggable();
  const cable = new SvgCable(svg, color, cableDirection, originX + bbox.width / 2, originY + bbox.height / 2);
  let firstTime = true;
  let clone = null;
  let dragStartPointX = null;
  let dragStartPointY = null;
  plug
    .on('dragstart', (e) => {
      if (firstTime) {
        clone = plug.clone();
        firstTime = false;
      }
      dragStartPointX = e.detail.p.x;
      dragStartPointY = e.detail.p.y;
    })
    .on('dragmove', (e) => {
      let dx = e.detail.p.x - dragStartPointX;
      let dy = e.detail.p.y - dragStartPointY;
      cable.dragEndPoint(dx, dy);
    })
    .on('dragend', (e) => {
      cable.endX = e.target.instance.x();
      cable.endY = e.target.instance.y();
      const [hitIndex, hitPlug] = collisionDetection(svg, counterpart, cable.endX, cable.endY);

      if (hitIndex === -1) {
        cable.remove();
        plug.remove();
        plug = clone
        return;
      }
      const myIndex = "parent";
      if (hitIndex !== myIndex) {
        callback(myIndex, hitIndex, plug, hitPlug);
      }
      cable.remove();
      plug.remove();
      plug = clone
    });
  return [plug, cable.cable];
}


export function createLower(svg, originX, originY, offsetX, offsetY, color, sio) {
  return createLCPlugAndCable(svg, originX + offsetX, originY + offsetY, true, color, DPlug, 'DU', '.upperPlug', function (myIndex, hitIndex, plug) {
    sio.emit('addLink', { src: myIndex, dst: hitIndex, isElse: plug.hasClass('elsePlug') });
  });
}

export function createConnector(svg, originX, originY, offsetX, offsetY, sio) {
  offsetY += calcFileBasePosY();
  return createLCPlugAndCable(svg, originX + offsetX, originY + offsetY, false, config.plug_color.file, RPlug, 'RL', '.receptorPlug', function (myIndex, hitIndex, plug, hitPlug) {
    let srcName = plug.data('name');
    let dstName = hitPlug.data('name');
    sio.emit('addFileLink', { src: myIndex, dst: hitIndex, srcName: srcName, dstName: dstName });
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

export function createBox(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host) {
  const box = new SvgBox(svg, x, y, type, name, inputFiles, outputFiles, state, nodes, numTotal, numFinished, numFailed, host);
  return [box.box, box.textHeight];
}

//parent - children relation 
export function createFilesNameBox(svg, x, y, type, name, inputFiles, outputFiles) {
  const box = new SvgParentFilesBox(svg, x, y, type, name, inputFiles, outputFiles);
  return [box.box, box.textHeight];
}

//parent -> children connector
//位置の変更が必要な可能性有
export function createParentConnector(svg, originX, originY, offsetX, offsetY, sio) {
  // offsetY += calcFileBasePosY();
  return createParentCPlugAndCable(svg, originX + offsetX, originY + offsetY, false, config.plug_color.file, parentLPlug, 'RL', '.receptorPlug', function (myIndex, hitIndex, plug, hitPlug) {
    let srcName = plug.data('name');
    let dstName = hitPlug.data('name');
    sio.emit('addFileLink', { src: myIndex, dst: hitIndex, srcName: srcName, dstName: dstName });
  });
}

//children -> parent connector
//位置の変更が必要な可能性有
export function createParentReceptor(svg, originX, originY, offsetX, offsetY) {
  const plug = svg.polygon(parentRPlug).fill(config.plug_color.file).addClass('receptorPlug');
  const bbox = plug.bbox();
  // 272 = Property Area width
  plug.move(window.innerWidth - 272, originY + offsetY + calcFileBasePosY());
  return plug;
}
