function isInitialNode(node){
  return node.previous.length===0 && node.inputFiles.length===0;
}

module.exports.isInitialNode = isInitialNode;
