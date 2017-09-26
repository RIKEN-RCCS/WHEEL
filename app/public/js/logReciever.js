function logReciever(socket) {
    // enable all log
    socket.on('logDBG', addLog);
    socket.on('logINFO', addLog);
    socket.on('logWARN', addLog);
    socket.on('logERR', addLog);
    socket.on('logStdout', addLog);
    socket.on('logStderr', addLog);
    socket.on('logSSHout', addLog);
    socket.on('logSSHerr', addLog);
    // enable/disable when checkbox is changed
    $('#enableDBG').change(function () {
        if ($('#enableDBG').prop('checked')) {
            socket.on('logDBG', addLog);
        }
        else {
            socket.off('logDBG');
        }
    });
    $('#enableINFO').change(function () {
        if ($('#enableINFO').prop('checked')) {
            socket.on('logINFO', addLog);
        }
        else {
            socket.off('logINFO');
        }
    });
    $('#enableWARN').change(function () {
        if ($('#enableWARN').prop('checked')) {
            socket.on('logWARN', addLog);
        }
        else {
            socket.off('logWARN');
        }
    });
    $('#enableERR').change(function () {
        if ($('#enableERR').prop('checked')) {
            socket.on('logERR', addLog);
        }
        else {
            socket.off('logERR');
        }
    });
    $('#enableStdout').change(function () {
        if ($('#enableStdout').prop('checked')) {
            socket.on('logStdout', addLog);
        }
        else {
            socket.off('logStdout');
        }
    });
    $('#enableStderr').change(function () {
        if ($('#enableStderr').prop('checked')) {
            socket.on('logStderr', addLog);
        }
        else {
            socket.off('logStderr');
        }
    });
    $('#enableSSHout').change(function () {
        if ($('#enableSSHout').prop('checked')) {
            socket.on('logSSHout', addLog);
        }
        else {
            socket.off('logSSHout');
        }
    });
    $('#enableSSHerr').change(function () {
        if ($('#enableSSHerr').prop('checked')) {
            socket.on('logSSHerr', addLog);
        }
        else {
            socket.off('logSSHerr');
        }
    });
    $("#clear_log").click(function () {
        $("#log").empty();
    });
}
function addLog(msg) {
    $('#log').append(msg.toString() + '\n');
    var area = $('#log_area');
    area.scrollTop = area.scrollHeight;
}
//# sourceMappingURL=logReciever.js.map