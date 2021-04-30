/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
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
                $('#enableSSHout').css('color', "#FFFFFF");
                $('#logSSHoutLog').show();
                $('#enableSSHout').css('border-bottom-color', "#88BB00");
                break;

            case "enableSSHerr":
                receiveSSHerrLog = true;
                $('#enableSSHerr').css('color', "#FFFFFF");
                $('#logSSHerrLog').show();
                $('#enableSSHerr').css('border-bottom-color', "#88BB00");
                break;
        }
    });

    $("#logClearButton").click(function () {
        $(".logText").empty();
        $('.logButton').css('color', "#FFFFFF");
    });
}

function addDebugLog(msg) {
    var debugLogID = `debug_${debugLogReceiveCount}`
    var logContent = document.getElementById("logDebugLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${debugLogID} class="logContent">${addMessage}</pre>`);
    if (debugLogReceiveCount > maxViewLog) {
        let targetIndex = debugLogReceiveCount - maxViewLog - 1;
        let targetElementID = `debug_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    debugLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}

function addInfoLog(msg) {
    if (receiveINFOLog === false && firstRecieveFlag === false) {
        $('#enableINFO').css('color', "red");
    }
    var infoLogID = `info_${infoLogReceiveCount}`
    var logContent = document.getElementById("logInfoLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${infoLogID} class="logContent">${addMessage}</pre>`);
    if (infoLogReceiveCount > maxViewLog) {
        let targetIndex = infoLogReceiveCount - maxViewLog - 1;
        let targetElementID = `info_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    infoLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}

function addStdoutLog(msg) {
    if (receiveStdoutLog === false) {
        $('#enableStdout').css('color', "red");
    }
    var stdoutLogID = `stdout_${stdoutLogReceiveCount}`
    var logContent = document.getElementById("logStdoutLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${stdoutLogID} class="logContent">${addMessage}</pre>`);
    if (stdoutLogReceiveCount > maxViewLog) {
        let targetIndex = stdoutLogReceiveCount - maxViewLog - 1;
        let targetElementID = `stdout_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    stdoutLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}

function addStderrLog(msg) {
    if (receiveStderrLog === false) {
        $('#enableStderr').css('color', "red");
    }
    var stderrLogID = `stderr_${stderrLogReceiveCount}`
    var logContent = document.getElementById("logStderrLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${stderrLogID} class="logContent">${addMessage}</pre>`);
    if (stderrLogReceiveCount > maxViewLog) {
        let targetIndex = stderrLogReceiveCount - maxViewLog - 1;
        let targetElementID = `stderr_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    stderrLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}

function addSSHoutLog(msg) {
    if (receiveSSHoutLog === false) {
        $('#enableSSHout').css('color', "red");
    }
    var sshoutLogID = `sshout_${sshoutLogReceiveCount}`
    var logContent = document.getElementById("logSSHoutLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${sshoutLogID} class="logContent">${addMessage}</pre>`);
    if (sshoutLogReceiveCount > maxViewLog) {
        let targetIndex = sshoutLogReceiveCount - maxViewLog - 1;
        let targetElementID = `sshout_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    sshoutLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}

function addSSHerrLog(msg) {
    if (receiveSSHerrLog === false) {
        $('#enableSSHerr').css('color', "red");
    }
    var ssherrLogID = `ssherr_${ssherrLogReceiveCount}`
    var logContent = document.getElementById("logSSHerrLog");
    var addMessage = msg.toString();
    var maxViewLog = 1000;
    logContent.insertAdjacentHTML("beforeend", `<pre id=${ssherrLogID} class="logContent">${addMessage}</pre>`);
    if (ssherrLogReceiveCount > maxViewLog) {
        let targetIndex = ssherrLogReceiveCount - maxViewLog - 1;
        let targetElementID = `ssherr_${targetIndex}`
        let deleteElement = document.getElementById(targetElementID);
        logContent.removeChild(deleteElement);
    }
    ssherrLogReceiveCount++;
    logContent.scrollTop = logContent.scrollHeight;
}
