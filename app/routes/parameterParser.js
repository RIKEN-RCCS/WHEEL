const {getLogger} = require('../logSettings');
const logger = getLogger('workflow');

function isValidParamAxis(min, max, step){
  if(max <= min) return false;
  if(step === 0) return false;
  return true;
}

function calcParamAxisSize(min, max, step){
  return Math.floor((max-min)/Math.abs(step))+1;
}

function getParamAxisSize(axis){
  if(axis.type === 'string' || axis.type === 'file'){
    return axis.list.length;
  }else if (axis.type === 'integer' ||  axis.type === 'float'){
    return calcParamAxisSize(axis.min, axis.max, axis.step);
  }
  logger.warn('invalid param type', axis.type);
  return 0;
}

function getNthValue(n, axis){
  if(axis.list != null){
    return axis.list[n];
  }else{
    return  (0 < axis.step ? axis.min : axis.max) + axis.step * n;
  }
}

function getNthParamVec(n, ParamSpace){
  let paramVec =[];
  for(let i = 0; i < ParamSpace.length; i++){
    let axis=ParamSpace[i];
    let l = getParamAxisSize(axis);
    let j = n % l;
    let value = getNthValue(j, axis);
    if(axis.type === 'integer'){
      value = parseInt(value);
    }else if(axis.type === 'float'){
      value = parseFloat(value);
    }
    paramVec.push({key: axis.keyword, value: value, type: axis.type});
    n = Math.floor(n/l);
  }
  return paramVec;
}

function getParamSize(ParamSpace){
  return ParamSpace.reduce((p, a)=>{
    let paramAxisSize=getParamAxisSize(a);
    return paramAxisSize !== 0 ? p*paramAxisSize: p
  }, 1);
}

function* paramVecGenerator(ParamSpace){
  let totalSize=getParamSize(ParamSpace);
  let index=0;
  while(index < totalSize){
    yield getNthParamVec(index, ParamSpace);
    index++;
  }
}

function getFilenames(ParamSpace){
  return ParamSpace.reduce((p,c,i)=>{
    if(c.type !== 'file') return p;
    return p.concat(c.list);
  }, []);
}

function removeInvalid(paramSpace){
  // work around
  // TODO fix bug in rapid client.js
  paramSpace.forEach((e)=>{
      if(e.type === 'integer'){
        e.min = parseInt(e.min);
        e.max = parseInt(e.max);
        e.step = parseInt(e.step);
      }else if(e.type === 'float'){
        e.min = parseFloat(e.min);
        e.max = parseFloat(e.max);
        e.step = parseFloat(e.step);
      }else if(e.type === 'file'){
        e.list = e.list.filter((filename)=>{
          return filename !== ''
        });
      }
    });
  return paramSpace.filter((e)=>{
    if(e.type === 'file' || e.type === 'string'){
      if(e.list.length >0){
        return true
      }
    }else if(e.type === 'integer' || e.type === 'float'){
      return isValidParamAxis(e.min, e.max, e.step);
    }
  });
}

module.exports.paramVecGenerator=paramVecGenerator;
module.exports.getParamSize=getParamSize;
module.exports.getFilenames=getFilenames;
module.exports.removeInvalid=removeInvalid;
