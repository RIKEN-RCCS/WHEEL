class TCS {
  getQsubCmd(){
    return 'pjsub';
  }
  getQstatCmd(){
    return 'pjstat --format=|sed';
  }
  getQdelCmd(){
    return 'pjdel';
  }
  parseQstat(string){
    //TODO
    return status;
  }
}

class K extends TCS{
  getOptions(){
    return [
      '

    ]
  }
}
