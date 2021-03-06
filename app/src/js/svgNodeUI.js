/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
import 'svg.draggable.js/dist/svg.draggable.js';
import '../css/workflow.css';

import config from './config';
import * as parts from './svgParts';

/**
 * svg node
 */
//export default class{
export class SvgNodeUI {
  /**
   * create new instance
   * @param svg  svg.js's instance
   * @param sio  socket.io's instance
   * @param node any node instance to draw
   */
  constructor(svg, sio, node) {
    /** svg.js's instance*/
    this.svg = svg;
    this.sio = sio;
    this.editDisable = false;

    /** cable instance container */
    this.nextLinks = [];
    this.elseLinks = [];
    this.previousLinks = [];
    this.outputFileLinks = [];
    this.inputFileLinks = [];

    /** svg representation of this node */
    this.group = svg.group();
    this.group.data({ "ID": node.ID, "type": node.type, "name": node.name, "disable": node.disable }).draggable().addClass('node');

    // draw node
    const [box, textHeight] = parts.createBox(svg, node.pos.x, node.pos.y, node.type, node.name, node.inputFiles, node.outputFiles, node.state, node.descendants, node.numTotal, node.numFinished, node.numFailed, node.host, node.useJobScheduler, node.updateOnDemand, node.disable, node.stepnum);
    const boxBbox = box.bbox();
    const boxX = box.x();
    const boxY = box.y();
    this.group.add(box);
    this.group.data({ "boxBbox": boxBbox });

    let useDependency;
    if (typeof node.useDependency !== undefined) {
      useDependency = node.useDependency;
    } else {
      useDependency = false;
    }
    this.useDependency = useDependency;
    //draw plugs
    if (node.type !== 'source' && node.type !== 'viewer') {
      const upper = parts.createUpper(svg, boxX, boxY, boxBbox.width / 2, 0);
      upper.data({ "type": 'upperPlug', "ID": node.ID, "useDependency": useDependency }).attr('id', `${node.name}_upper`);
      this.group.add(upper);
    }

    let numLower = 0;
    let tmp = null;
    if (node.type !== 'source' && node.type !== 'viewer') {
      numLower = node.type === 'if' ? 3 : 2;

      if (numLower === 2) {
        [this.lowerPlug, tmp] = parts.createLower(svg, boxX, boxY, boxBbox.width / numLower, boxBbox.height, config.plug_color.flow, sio, node.type);
      } else {
        [this.lowerPlug, tmp] = parts.createLower(svg, boxX, boxY, boxBbox.width / numLower * 2, boxBbox.height, config.plug_color.flow, sio, node.type);
      }
      this.lowerPlug.addClass('lowerPlug').data({ "next": node.next }).attr('id', `${node.name}_lower`);
      this.group.add(this.lowerPlug).add(tmp);
    }

    this.connectors = [];
    if (node.type !== 'viewer') {
      this.group.data({ "outputFiles": node.outputFiles });
      node.outputFiles.forEach((output, fileIndex) => {
        let [plug, cable] = parts.createConnector(svg, boxX, boxY, boxBbox.width, textHeight * fileIndex, sio, node.type);
        const outputName = output.name.replace(/([*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "");
        plug.data({ "name": output.name, "dst": output.dst }).attr('id', `${node.name}_${outputName}_connector`);
        this.group.add(plug);
        this.group.add(cable);
        this.connectors.push(plug);
      });
    }

    if (node.type !== 'source') {
      this.group.data({ "inputFiles": node.inputFiles });
      node.inputFiles.forEach((input, fileIndex) => {
        const receptor = parts.createReceptor(svg, boxX, boxY, 0, textHeight * fileIndex);
        const inputName = input.name.replace(/([*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "");
        receptor.data({ "ID": node.ID, "name": input.name, "type": node.type, "src": input.src }).attr('id', `${node.name}_${inputName}_receptor`);
        this.group.add(receptor);
      });
    }

    if (numLower === 3) {
      [this.lower2Plug, tmp] = parts.createLower(svg, boxX, boxY, boxBbox.width / numLower, boxBbox.height, config.plug_color.elseFlow, sio)
      this.lower2Plug.addClass('elsePlug').data({ "else": node.else }).attr('id', `${node.name}_else`);
      this.group.add(this.lower2Plug).add(tmp);
    }

    if (node != null && node.jsonFile != null) {
      this.group.data({ "path": node.path, "jsonFile": node.jsonFile });
    }

    // difference between box origin and mouse pointer
    let diffX = 0;
    let diffY = 0;
    // mouse pointer coordinate on dragstart
    let startX = 0;
    let startY = 0;
    // register drag and drop behavior
    this.group
      .on('dragstart', (e) => {
        if (!this.editDisable) {
          diffX = e.detail.p.x - e.target.instance.select(`.svg_${node.name}_box`).first().x();
          diffY = e.detail.p.y - e.target.instance.select(`.svg_${node.name}_box`).first().y()
          startX = e.detail.p.x;
          startY = e.detail.p.y;
        } else {
          e.preventDefault();
        }
      })
      .on('dragmove', (e) => {
        if (!this.editDisable) {
          let dx = e.detail.p.x - startX;
          let dy = e.detail.p.y - startY;
          this.reDrawLinks(dx, dy);
        } else {
          e.preventDefault();
        }
      })
      .on('dragend', (e) => {
        if (!this.editDisable) {
          let x = e.detail.p.x;
          let y = e.detail.p.y;
          if (x !== startX || y !== startY) {
            sio.emit('updateNode', node.ID, 'pos', { 'x': x - diffX, 'y': y - diffY });
          }
        } else {
          e.preventDefault();
        }
      });
  }

  /**
   * draw cables between Lower-Upper and Connector-Receptor respectively
   */
  drawLinks() {
    let boxBbox = this.group.data('boxBbox');
    let upperPlugs = this.svg.select('.upperPlug');
    if (this.hasOwnProperty('lowerPlug')) {
      let srcPlug = this.lowerPlug;
      srcPlug.data('next').forEach((dstIndex) => {
        let dstPlug = upperPlugs.members.find((plug) => {
          return plug.data('ID') === dstIndex;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.flow, 'DU', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
        cable.cable.data('dst', dstIndex).attr('id', `${srcPlug.node.id}_${dstPlug.node.id}_cable`);
        if (dstPlug.data('useDependency') === true) {
          cable.cable.attr('stroke-dasharray', '4 4');
        }
        this.nextLinks.push(cable);
        dstPlug.on('click', (e) => {
          if (!this.editDisable) {
            this.sio.emit('removeLink', { src: this.group.data('ID'), dst: dstIndex, isElse: false });
          } else {
            e.preventDefault();
          }
        });
      });
    }
    if (this.hasOwnProperty('lower2Plug')) {
      let srcPlug = this.lower2Plug;
      srcPlug.data('else').forEach((dstIndex) => {
        let dstPlug = upperPlugs.members.find((plug) => {
          return plug.data('ID') === dstIndex;
        });
        const cable = new parts.SvgCable(this.svg, config.plug_color.elseFlow, 'DU', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
        cable.cable.data('dst', dstIndex).attr('id', `${srcPlug.node.id}_${dstPlug.node.id}_cable`);
        this.elseLinks.push(cable);
        dstPlug.on('click', (e) => {
          if (!this.editDisable) {
            this.sio.emit('removeLink', { src: this.group.data('ID'), dst: dstIndex, isElse: true });
          } else {
            e.preventDefault();
          }
        });
      });
    }
    let receptorPlugs = this.svg.select('.receptorPlug');

    this.connectors.forEach((srcPlug) => {
      srcPlug.data('dst').forEach((dst) => {
        let dstPlug = receptorPlugs.members.find((plug) => {
          return plug.data('ID') === dst.dstNode && plug.data('name') === dst.dstName;
        });

        const cable = new parts.SvgCable(this.svg, config.plug_color.file, 'RL', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
        cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
        cable.cable.data('dst', dst.dstNode).attr('id', `${srcPlug.node.id}_${dstPlug.node.id}_cable`);
        this.outputFileLinks.push(cable);

        dstPlug.on('click', (e) => {
          if (!this.editDisable) {
            this.sio.emit('removeFileLink', this.group.data('ID'), srcPlug.data('name'), dst.dstNode, dst.dstName);
          } else {
            e.preventDefault();
          }
        });
      });
    });
  }
  /**
   * redraw cables between Lower-Upper and Connector-Receptor respectively
   * @param offsetX x coordinate difference from dragstart
   * @param offsetY y coordinate difference from dragstart
   */
  reDrawLinks(offsetX, offsetY) {
    let boxBbox = this.group.data('boxBbox');
    this.nextLinks.forEach((v) => {
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.elseLinks.forEach((v) => {
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.outputFileLinks.forEach((v) => {
      v.dragStartPoint(offsetX, offsetY, boxBbox);
    });
    this.previousLinks.forEach((v) => {
      v.dragEndPoint(offsetX, offsetY, boxBbox);
    });
    this.inputFileLinks.forEach((v) => {
      v.dragEndPoint(offsetX, offsetY, boxBbox);
    });
  }

  /**
   * delete svg element of this node
   */
  remove() {
    this.group.remove();
    this.nextLinks.forEach((v) => {
      v.cable.remove();
    });
    this.elseLinks.forEach((v) => {
      v.cable.remove();
    });
    this.outputFileLinks.forEach((v) => {
      v.cable.remove();
    });
    this.previousLinks.forEach((v) => {
      v.cable.remove();
    });
    this.inputFileLinks.forEach((v) => {
      v.cable.remove();
    });
  }

  /**
   * register callback function to 'mousedown' event
   */
  onMousedown(callback) {
    this.group.on('mousedown', callback);
    return this;
  }

  /**
   * register callback function to 'dblclick' event
   */
  onDblclick(callback) {
    this.group.on('dblclick', callback);
    return this;
  }

  onClick(callback) {
    this.group.on('click', callback);
    return this;
  }

  setEditDisable(editDisable) {
    this.editDisable = editDisable;
    return;
  }
}

export function setEditDisable(svg, nodes, editDisable) {
  let plugNames = ['.upperPlug', '.receptorPlug', '.lowerPlug', '.lower2Plug', '.connectorPlug'];
  plugNames.forEach(function (plugName) {
    let plugs = svg.select(plugName);
    if (plugs !== undefined) {
      plugs.each(function (i, p) {
        p[i].data({ "edit_disable": editDisable });
      });
    }
  });
  nodes.forEach(function (node) {
    if (node != null) {
      node.setEditDisable(editDisable);
    }
  });
  return;
}
/**
 * svg parent node
 */
export class SvgParentNodeUI {
  /**
   * create new instance
   * @param svg  svg.js's instance
   * @param sio  socket.io's instance
   * @param parentnode parent inputFiles instance to draw
   */
  constructor(svg, sio, parentnode) {
    /** svg.js's instance*/
    this.svg = svg;
    this.sio = sio;

    /** cable instance container */
    this.outputFileLinks = [];
    this.inputFileLinks = [];

    /** svg representation of this node */
    this.group = svg.group();
    this.group.data({ "ID": 'parent', "type": parentnode.type }).addClass('parentnode');

    // draw input output file name
    let fileNameXpos = 0;
    let fileNameYpos = 0;
    const [box, textHeight] = parts.createFilesNameBox(svg, fileNameXpos, fileNameYpos, parentnode.type, parentnode.name, parentnode.outputFiles, parentnode.inputFiles);
    const boxBbox = box.bbox();
    this.group.add(box);
    this.group.data({ "boxBbox": boxBbox });

    // draw connector
    this.connectors = [];
    parentnode.inputFiles.forEach((input, fileIndex) => {
      //ファイル名の最大値程度
      let connectorXpos = 240;
      //コネクター間の幅、コネクターの高さ
      let connectorYpos = 32;
      const connectorHeight = 32;
      const connectorInterval = connectorHeight * 1.5;
      let [plug, cable] = parts.createParentConnector(svg, connectorXpos, connectorYpos, 0, connectorInterval * fileIndex, sio, parentnode.type);
      const inputName = input.name.replace(/([*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "");
      plug.data({ "name": input.name, "forwardTo": input.forwardTo }).attr('id', `${parentnode.name}_${inputName}_connector`);
      this.group.add(plug);
      this.group.add(cable);
      this.connectors.push(plug);
    });

    // draw receptor
    parentnode.outputFiles.forEach((output, fileIndex) => {
      const recepterHeight = 32;
      const recepterInterval = recepterHeight * 1.5;
      //-425 = -(108 +32 +221)
      //     = -(ヘッダ + 初期位置補正 + 位置調整)
      let recepterPosY = window.innerHeight - 361;
      const propertyAreaWidth = 272;
      let recepterPosX = window.innerWidth - propertyAreaWidth;
      const receptor = parts.createParentReceptor(svg, recepterPosX, recepterPosY, 0, recepterInterval * fileIndex);
      const outputName = output.name.replace(/([*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "");
      receptor.data({ "ID": parentnode.ID, "name": output.name ,"src": output.dst}).attr('id', `${parentnode.name}_${outputName}_receptor`);

      this.group.add(receptor);
    });
  }

  /**
   * draw Connector-Receptor
   */
  drawParentLinks() {
    let boxBbox = this.group.data('boxBbox');
    let receptorPlugs = this.svg.select('.receptorPlug');
    this.connectors.forEach((srcPlug) => {
      if (srcPlug.data('forwardTo') !== undefined) {
        srcPlug.data('forwardTo').forEach((dst) => {
          let dstPlug = receptorPlugs.members.find((plug) => {
            return plug.data('ID') === dst.dstNode && plug.data('name') === dst.dstName;
          });
          const cable = new parts.SvgCable(this.svg, config.plug_color.file, 'RL', srcPlug.cx(), srcPlug.cy(), dstPlug.cx(), dstPlug.cy());
          cable._draw(cable.startX, cable.startY, cable.endX, cable.endY, boxBbox);
          cable.cable.data('dst', dst.dstNode).attr('id', `${srcPlug.node.id}_${dstPlug.node.id}_cable`);
          this.inputFileLinks.push(cable);

          dstPlug.on('click', (e) => {
            this.sio.emit('removeFileLink', this.group.data('ID'), srcPlug.data('name'), dst.dstNode, dst.dstName);
          });
        });
      }
    });
  }

  /**
 * delete svg element of this node
 */
  remove() {
    this.group.remove();
    this.outputFileLinks.forEach((v) => {
      v.cable.remove();
    });
    this.inputFileLinks.forEach((v) => {
      v.cable.remove();
    });
  }
  /**
 * register callback function to 'mousedown' event
 */
  onMousedown(callback) {
    this.group.on('mousedown', callback);
    return this;
  }

}
