class FileBrowser {
    constructor(socket, idFileList, recvEventName) {
        this.requestedPath = null;
        this.socket = socket;
        this.idFileList = idFileList;
        this.recvEventName = recvEventName;
        this.selectedFile = "";
        this.onRecv();
        this.onClick();
        this.onDirDblClick();
    }
    request(eventName, path) {
        this.socket.emit(eventName, path);
        this.requestedPath = path;
        this.sendEventName = eventName;
    }
    getRequestedPath() {
        return this.requestedPath;
    }
    getSelectedFile() {
        return this.selectedFile;
    }
    onRecv() {
        this.socket.on('fileList', (data) => {
            if (!data.hasOwnProperty('path'))
                return;
            if (!data.hasOwnProperty('name'))
                return;
            if (!data.hasOwnProperty('isdir'))
                return;
            if (!data.hasOwnProperty('islink'))
                return;
            if (this.requestedPath != null && this.requestedPath != data.path) {
                return;
            }
            var iconClass = data.isdir ? 'fa-folder-o' : 'fa-file-o';
            var icon = data.islink ? `<span class="fa-stack fa-lg"><i class="fa ${iconClass} fa-stack-2x"></i><i class="fa fa-share fa-stack-1x"></i></span>`
                : `<i class="fa ${iconClass} fa-2x" aria-hidden="true"></i>`;
            var item = $(`<li data-path="${data.path}" data-isdir="${data.isdir}" data-islink="${data.islink}">${icon} ${data.name}</li>`);
            $(this.idFileList).append(item);
            this.defaultColor = $(`${this.idFileList} li`).css('background-color');
            this.requestedPath = data.path;
        });
    }
    onClick() {
        $(this.idFileList).on("click", 'li', (event) => {
            this.changeColorsWhenSelected();
            this.selectedFile = $(event.target).text().trim();
        });
    }
    onDirDblClick() {
        $(this.idFileList).on("dblclick", 'li', (event) => {
            if ($(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                this.request(this.sendEventName, target);
                $(this.idFileList).empty();
            }
        });
    }
    onFileDblClick(func) {
        $(this.idFileList).on("dblclick", 'li', (event) => {
            if (!$(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                func(target);
            }
        });
    }
    changeColorsWhenSelected() {
        $(`${this.idFileList} li`).css('background-color', this.defaultColor);
        $(event.target).css('background-color', 'lightblue');
    }
}
//# sourceMappingURL=fileBrowser.js.map