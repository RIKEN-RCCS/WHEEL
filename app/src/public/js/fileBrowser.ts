class FileBrowser{
public constructor(socket: SocketIOClient.Socket, idFileList, recvEventName) {
  this.socket=socket;
  this.idFileList=idFileList;
  this.recvEventName=recvEventName;
  this.onRecvDefault();
  this.onClickDefault();
  this.onDirDblClickDefault();
  this.registerContextMenu();
}

// mothods
public request(sendEventName, path, recvEventName){
  this.socket.emit(sendEventName, path);
  this.requestedPath=path;
  this.sendEventName=sendEventName;
  if(! recvEventName) this.recvEventName=recvEventName;
}
public getRequestedPath(){
  return this.requestedPath;
}
public getSelectedFile(){
  return this.getLastClicked();
}
public getLastClicked(){
  return this.lastClicked;
}

// additional event registers
public onRecv(func){
    this.socket.on(this.recvEventName, (data)=>{
      func(data);
    });
}
public onClick(func){
  $(this.idFileList).on("click", 'li', (event)=>{
    var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
    func(target)
  });
}
public onFileClick(func){
    $(this.idFileList).on("click", 'li', (event)=>{
      if(! $(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        func(target);
      }
    });
}
public onFileDblClick(func){
    $(this.idFileList).on("dblclick", 'li', (event)=>{
      if(! $(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        func(target);
      }
    });
}
public onDirClick(func){
    $(this.idFileList).on("click", 'li', (event)=>{
      if($(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        func(target);
      }
    });
}
public onDirDblClick(func){
    $(this.idFileList).on("dblclick", 'li', (event)=>{
      if($(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        func(target);
      }
    });
}



private defaultColor: string = null;
private selectedItemColor: string='lightblue';
private idFileList: string = null;
private lastClicked: string = null;
private sendEventName: string = null;
private recvEventName: string = null;
private socket: SocketIOClient.Socket = null;
private requestedPath=null;

private registerContextMenu(){
  $.contextMenu({
    'selector': `${this.idFileList} li`,
      'items': {
        'rename':{
          name: 'Rename',
          callback: function (){
            var oldName=$(this).data('label');
            $('#renameDialog').attr('data-oldName', oldName)
            $('#renameDialog').dialog('open');
          }
        },
        'delete':{
          name: 'Delete',
          callback: function (){
            var targetID=$(this).data('id');
            $('#removeDialog').attr('data-targetId', targetID)
            $('#removeDialog').dialog('open');
          }
        }
      }
  });
}

private onRecvDefault(){
    this.socket.on(this.recvEventName, (data)=>{
      if(! this.isValidData(data)) return;
      var iconClass = data.isdir ? 'fa-folder-o' : 'fa-file-o';
      var icon = data.islink ? `<span class="fa-stack fa-lg"><i class="fa ${iconClass} fa-stack-2x"></i><i class="fa fa-share fa-stack-1x"></i></span>`
                             : `<i class="fa ${iconClass} fa-2x" aria-hidden="true"></i>`;

                             var item = $(`<li data-path="${data.path}" data-isdir="${data.isdir}" data-islink="${data.islink}">${icon} ${data.name}</li>`);
      $(this.idFileList).append(item);
      $(`${this.idFileList} li`).sort(function(l,r){
        return $(l).text() > $(r).text()? 1:-1;
      });
      this.defaultColor=$(`${this.idFileList} li`).css('background-color')
      this.requestedPath=data.path;
    });
}

private onClickDefault(){
  $(this.idFileList).on("click", 'li', (event)=>{
    this.changeColorsWhenSelected();
    this.lastClicked=$(event.target).text().trim();
  });
}

private onDirDblClickDefault(){
    $(this.idFileList).on("dblclick", 'li', (event)=>{
      if($(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        this.request(this.sendEventName, target, null);
        $(this.idFileList).empty();
      }
    });
}

private changeColorsWhenSelected(){
  $(`${this.idFileList} li`).css('background-color', this.defaultColor);
  $(event.target).css('background-color', this.selectedItemColor);
}
private isValidData(data){
  if(!data.hasOwnProperty('path')) return false;
  if(!data.hasOwnProperty('name')) return false;
  if(!data.hasOwnProperty('isdir')) return false;
  if(!data.hasOwnProperty('islink')) return false;
  if(!(this.requestedPath === null || this.requestedPath === data.path)){
    return false;
  }
  return true;
}
}
