import $ from 'jquery';

let firstRecieveFlag = true;
let receiveINFOLog = false;
let receiveStdoutLog = false;
let receiveStderrLog = false;
let receiveSSHoutLog = false;
let receiveSSHerrLog = false;
let debugLogReceiveCount = 0;
let infoLogReceiveCount = 0;
let stdoutLogReceiveCount = 0;
let stderrLogReceiveCount = 0;
let sshoutLogReceiveCount = 0;
let ssherrLogReceiveCount = 0;

export default function (socket) {
    // initial enable log
    socket.on('logDBG', addDebugLog);
    socket.on('logINFO', addInfoLog);
    socket.on('logWARN', addInfoLog);
    socket.on('logERR', addInfoLog);
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
                $('#enableINFO').css('color', "#FFFFFF");
                $('#logSSHoutLog').show();
                $('#enableSSHout').css('border-bottom-color', "#88BB00");
                break;

            case "enableSSHerr":
                receiveSSHerrLog = true;
                $('#enableINFO').css('color', "#FFFFFF");
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
    var logText = document.getElementById("logDebugLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (debugLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    debugLogReceiveCount++;
    var target = $('#logDebugLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addInfoLog(msg) {
    if (receiveINFOLog === false && firstRecieveFlag === false) {
        $('#enableINFO').css('color', "red");
    }
    var logText = document.getElementById("logInfoLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (infoLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    infoLogReceiveCount++;
    var target = $('#logInfoLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addStdoutLog(msg) {
    if (receiveStdoutLog === false) {
        $('#enableStdout').css('color', "red");
    }
    var logText = document.getElementById("logStdoutLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (stdoutLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    stdoutLogReceiveCount++;
    var target = $('#logStdoutLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addStderrLog(msg) {
    if (receiveStderrLog === false) {
        $('#enableStderr').css('color', "red");
    }
    var logText = document.getElementById("logStderrLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (stderrLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    stderrLogReceiveCount++;
    var target = $('#logStderrLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addSSHoutLog(msg) {
    if (receiveSSHoutLog === false) {
        $('#enableSSHout').css('color', "red");
    }
    var logText = document.getElementById("logSSHoutLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (sshoutLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    sshoutLogReceiveCount++;
    var target = $('#logSSHoutLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
}

function addSSHerrLog(msg) {
    if (receiveSSHerrLog === false) {
        $('#enableSSHerr').css('color', "red");
    }
    var logText = document.getElementById("logSSHerrLog");
    logText.textContent += msg.toString() + '\n';
    var deleteTargetIndex = logText.textContent.indexOf('\n')
    var str = logText.textContent.slice(0, deleteTargetIndex + 1);
    if (ssherrLogReceiveCount > 1000) {
        logText.textContent = logText.textContent.replace(str, '');
    }
    ssherrLogReceiveCount++;
    var target = $('#logSSHerrLog').attr("id");
    var area = document.getElementById(target);
    area.scrollTop = area.scrollHeight;
} 