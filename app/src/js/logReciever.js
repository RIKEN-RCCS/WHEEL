import $ from 'jquery';

let firstRecieveFlag = true;
let receiveINFOLog = false;
let receiveStdoutLog = false;
let receiveStderrLog = false;
let receiveSSHoutLog = false;
let receiveSSHerrLog = false;
export default function (socket) {
    // initial enable log
    socket.on('logDBG', addDebugLog);
    socket.on('logINFO', addInfoLog);
    socket.on('logWARN', addWarnLog);
    socket.on('logERR', addErrLog);
    socket.on('logStdout', addStdoutLog);
    socket.on('logStderr', addStderrLog);
    socket.on('logSSHout', addSSHoutLog);
    socket.on('logSSHerr', addSSHerrLog);

    $('.logButton').click(function () {
        //socket.off('logDBG');
        firstRecieveFlag = false;
        receiveINFOLog = false;
        receiveStdoutLog = false;
        receiveStderrLog = false;
        receiveSSHoutLog = false;
        receiveSSHerrLog = false;

        $('.logText').css('display', "none");
        $('.logButton').css('border-bottom-color', "rgba(28,28,32,0.75)");

        let flag = $(this).attr("id");
        switch (flag) {
            case "enableDBG":
                $('#logDebugLog').show();
                $('#enableDBG').css('border-bottom-color', "#88BB00");
                break;

            case "enableINFO":
                receiveINFOLog = true;
                $('#enableINFO').css('color', "#FFFFFF");
                $('#logInfoLog').show();
                $('#enableINFO').css('border-bottom-color', "#88BB00");
                break;

            case "enableStdout":
                receiveStdoutLog = true;
                $('#enableStdout').css('color', "#FFFFFF");
                $('#logStdoutLog').show();
                $('#enableStdout').css('border-bottom-color', "#88BB00");
                break;

            case "enableStderr":
                receiveStderrLog = true;
                $('#enableStderr').css('color', "#FFFFFF");
                $('#logStderrLog').show();
                $('#enableStderr').css('border-bottom-color', "#88BB00");
                break;

            case "enableSSHout":
                receiveSSHoutLog = true;
                $('#logSSHoutLog').show();
                $('#enableSSHout').css('border-bottom-color', "#88BB00");
                break;

            case "enableSSHerr":
                receiveSSHerrLog = true;
                $('#logSSHerrLog').show();
                $('#enableSSHerr').css('border-bottom-color', "#88BB00");
                break;
        }
    });

    $("#logClearButton").click(function () {
        $(".logText").empty();
    });
}

function addDebugLog(msg) {
    $('#logDebugLog').append(msg.toString() + '\n');
    var target = $('#logDebugLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addInfoLog(msg) {
    if (receiveINFOLog === false && firstRecieveFlag === false) {
        $('#enableINFO').css('color', "red");
    }
    $('#logInfoLog').append(msg.toString() + '\n');
    var target = $('#logInfoLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addWarnLog(msg) {
    if (receiveINFOLog === false) {
        $('#enableINFO').css('color', "red");
    }
    $('#logInfoLog').append(msg.toString() + '\n');
    var target = $('#logInfoLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addErrLog(msg) {
    if (receiveINFOLog === false) {
        $('#enableINFO').css('color', "red");
    }
    $('#logInfoLog').append(msg.toString() + '\n');
    var target = $('#logInfoLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addStdoutLog(msg) {
    if (receiveStdoutLog === false) {
        $('#enableStdout').css('color', "red");
    }
    $('#logStdoutLog').append(msg.toString() + '\n');
    var target = $('#logStdoutLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addStderrLog(msg) {
    if (receiveStderrLog === false) {
        $('#enableStderr').css('color', "red");
    }
    $('#logStderrLog').append(msg.toString() + '\n');
    var target = $('#logStderrLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addSSHoutLog(msg) {
    if (receiveSSHoutLog === false) {
        $('#enableSSHout').css('color', "red");
    }
    $('#logSSHoutLog').append(msg.toString() + '\n');
    var target = $('#logSSHoutLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addSSHerrLog(msg) {
    if (receiveSSHerrLog === false) {
        $('#enableSSHerr').css('color', "red");
    }
    $('#logSSHerrLog').append(msg.toString() + '\n');
    var target = $('#logSSHerrLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
} 