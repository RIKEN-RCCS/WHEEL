class FileBrowser{
public constructor(socket: SocketIOClient.Socket, idFileList, recvEventName) {
  this.socket=socket;
  this.idFileList=idFileList;
  this.recvEventName=recvEventName;
  this.selectedFile="";
  this.onRecv();
  this.onClick();
  this.onDirDblClick();
}


public request(eventName, path){
  this.socket.emit(eventName, path);
  this.requestedPath=path;
  this.sendEventName=eventName;
}
public getRequestedPath(){
  return this.requestedPath;
}
public getSelectedFile(){
  return this.selectedFile;
}

private defaultColor: string;
private idFileList: string;
private selectedFile: string;
private sendEventName: string;
private recvEventName: string;
private socket: SocketIOClient.Socket;
private requestedPath=null;

private onRecv(){
    this.socket.on('fileList', (data)=>{
      if(!data.hasOwnProperty('path')) return;
      if(!data.hasOwnProperty('name')) return;
      if(!data.hasOwnProperty('isdir')) return;
      if(!data.hasOwnProperty('islink')) return;
      if(this.requestedPath!=null && this.requestedPath!=data.path){
        return;
      }

      var iconClass = data.isdir ? 'fa-folder-o' : 'fa-file-o';
      var icon = data.islink ? `<span class="fa-stack fa-lg"><i class="fa ${iconClass} fa-stack-2x"></i><i class="fa fa-share fa-stack-1x"></i></span>`
                             : `<i class="fa ${iconClass} fa-2x" aria-hidden="true"></i>`;

                             var item = $(`<li data-path="${data.path}" data-isdir="${data.isdir}" data-islink="${data.islink}">${icon} ${data.name}</li>`);
      $(this.idFileList).append(item);
      this.defaultColor=$(`${this.idFileList} li`).css('background-color')
      this.requestedPath=data.path;
    });
}

private onClick(){
  $(this.idFileList).on("click", 'li', (event)=>{
    this.changeColorsWhenSelected();
    this.selectedFile=$(event.target).text().trim();
  });
}
private onDirDblClick(){
    $(this.idFileList).on("dblclick", 'li', (event)=>{
      if($(event.target).data('isdir')){
        var target=$(event.target).data('path').trim()+'/'+$(event.target).text().trim();
        this.request(this.sendEventName, target);
        $(this.idFileList).empty();
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

private changeColorsWhenSelected(){
  $(`${this.idFileList} li`).css('background-color', this.defaultColor);
  $(event.target).css('background-color', 'lightblue');
}

}
