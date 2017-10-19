export default class {
  constructor(){
    this.nodes=[];
    this.selectedNode=null;
  }
  removeAll(){
    this.nodes.forEach(function(v){
      v.remove();
    });
  }
  add(node){
    this.nodes.push(node);
  }
  setSelectedNode(index){
    this.selectedNode = index;
  }
  getSelectedNode(){
    return this.selectedNode;
  }
}

