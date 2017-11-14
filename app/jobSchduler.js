class TCS {
  getQsubCmnd(){
    return 'pjsub';
  }
  getQstatCmd(){
    return 'pjstat';
  }
  getQdelCmd(){
    return 'pjdel';
  }
}

class K extends TCS{
  getOptions(){
    return [
      '

    ]
  }
}
