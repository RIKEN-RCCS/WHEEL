class ParallelNavi {
  getQsubCmd(){
    return 'pjsub';
  }
  getQstatCmd(){
    return 'pjstat';
  }
  getQdelCmd(){
    return 'pjdel';
  }
  parseQstat(string){
    //TODO
    return status;
  }
}

class K extends ParallelNavi{
  getOptions(){
    return [
      '

    ]
  }
}
