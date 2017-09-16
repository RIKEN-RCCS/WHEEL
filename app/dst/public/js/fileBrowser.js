class FileBrowser {
    constructor(socket, idFileList, recvEventName) {
        this.selectedItemColor = 'lightblue';
        this.requestedPath = null;
        this.socket = socket;
        this.idFileList = idFileList;
        this.recvEventName = recvEventName;
        this.selectedFile = "";
        this.onRecvDefault();
        this.onClickDefault();
        this.onDirDblClickDefault();
    }
    rename(oldName, newName) {
    }
    remove(name) {
    }
    upload() {
    }
    download() {
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
    onRecv(func) {
        this.socket.on(this.recvEventName, (data) => {
            func(data);
        });
    }
    onClick(func) {
        $(this.idFileList).on("click", 'li', (event) => {
            var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
            func(target);
        });
    }
    onFileClick(func) {
        $(this.idFileList).on("click", 'li', (event) => {
            if (!$(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                func(target);
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
    onDirClick(func) {
        $(this.idFileList).on("click", 'li', (event) => {
            if ($(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                func(target);
            }
        });
    }
    onDirDblClick(func) {
        $(this.idFileList).on("dblclick", 'li', (event) => {
            if ($(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                func(target);
            }
        });
    }
    onRecvDefault() {
        this.socket.on(this.recvEventName, (data) => {
            if (!this.isValidData(data))
                return;
            var iconClass = data.isdir ? 'fa-folder-o' : 'fa-file-o';
            var icon = data.islink ? `<span class="fa-stack fa-lg"><i class="fa ${iconClass} fa-stack-2x"></i><i class="fa fa-share fa-stack-1x"></i></span>`
                : `<i class="fa ${iconClass} fa-2x" aria-hidden="true"></i>`;
            var item = $(`<li data-path="${data.path}" data-isdir="${data.isdir}" data-islink="${data.islink}">${icon} ${data.name}</li>`);
            $(this.idFileList).append(item);
            this.defaultColor = $(`${this.idFileList} li`).css('background-color');
            this.requestedPath = data.path;
        });
    }
    onClickDefault() {
        $(this.idFileList).on("click", 'li', (event) => {
            this.changeColorsWhenSelected();
            this.selectedFile = $(event.target).text().trim();
        });
    }
    onDirDblClickDefault() {
        $(this.idFileList).on("dblclick", 'li', (event) => {
            if ($(event.target).data('isdir')) {
                var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
                this.request(this.sendEventName, target);
                $(this.idFileList).empty();
            }
        });
    }
    changeColorsWhenSelected() {
        $(`${this.idFileList} li`).css('background-color', this.defaultColor);
        $(event.target).css('background-color', this.selectedItemColor);
    }
    isValidData(data) {
        if (!data.hasOwnProperty('path'))
            return false;
        if (!data.hasOwnProperty('name'))
            return false;
        if (!data.hasOwnProperty('isdir'))
            return false;
        if (!data.hasOwnProperty('islink'))
            return false;
        if (!(this.requestedPath === null || this.requestedPath === data.path)) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=fileBrowser.js.map