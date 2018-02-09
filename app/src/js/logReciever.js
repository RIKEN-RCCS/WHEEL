import $ from 'jquery';
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
        $('.logText').css('display', "none");                    
        $('.logButton').css('border-bottom-color', "rgba(28,28,32,0.75)");                        

        let flag = $(this).attr("id");
        switch (flag){
            case "enableDBG":
            $('#logDebugLog').show();
            $('#enableDBG').css('border-bottom-color', "#88BB00");            
              break;
            
            case "enableINFO":
            $('#logInfoLog').show();
            $('#enableINFO').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableWARN":
            $('#logWarnLog').show();
            $('#enableWARN').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableERR":
            $('#logErrLog').show();
            $('#enableERR').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableStdout":
            $('#logStdoutLog').show();
            $('#enableStdout').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableStderr":
            $('#logStderrLog').show();
            $('#enableStderr').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableSSHout":
            $('#logSSHoutog').show();
            $('#enableSSHout').css('border-bottom-color', "#88BB00");                        
              break;

            case "enableSSHerr":
            $('#logSSHerrLog').show();
            $('#enableSSHerr').css('border-bottom-color', "#88BB00");                        
              break;
        } 
    });

    $("#clear_log").click(function(){
/*         $("#logDebugLog").empty();
        $("#logInfoLog").empty();
        $("#logWarnLog").empty();
        $("#logErrLog").empty();
        $("#logStdoutLog").empty();
        $("#logStderrLog").empty();
        $("#logSSHoutDog").empty();
        $("#logSSHerrDog").empty();     */    
        $(".logText").empty();        
    });
/* 
    $('#enableDBG').click(function () {
        if ($('#enableDBG').prop('checked')) {
            socket.on('logDBG', addLog);
        }
        else {
            socket.off('logDBG');
        }
    }); */
}

function addDebugLog(msg) {
    $('#logDebugLog').append(msg.toString() + '\n');
    var area = $('#debugLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addInfoLog(msg) {
    $('#logInfoLog').append(msg.toString() + '\n');
    var area = $('#infoLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addWarnLog(msg) {
    $('#logWarnLog').append(msg.toString() + '\n');
    var area = $('#warnLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addErrLog(msg) {
    $('#logErrLog').append(msg.toString() + '\n');
    var area = $('#errLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addStdoutLog(msg) {
    $('#logStdoutLog').append(msg.toString() + '\n');
    var area = $('#stdoutLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addStderrLog(msg) {
    $('#logStderrLog').append(msg.toString() + '\n');
    var area = $('#stderrLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addSSHoutLog(msg) {
    $('#logSSHoutLog').append(msg.toString() + '\n');
    var area = $('#ssherrLogArea');
    area.scrollTop = area.scrollHeight;
} 

function addSSHerrLog(msg) {
    $('#logSSHerrLog').append(msg.toString() + '\n');
    var area = $('#ssherrLogArea');
    area.scrollTop = area.scrollHeight;
} 