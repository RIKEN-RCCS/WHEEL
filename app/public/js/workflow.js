$(() => {
  // read cookies
  const cookies = ClientUtility.getCookies();
  const projectFilePath = cookies['project'];
  if (projectFilePath == null) {
    throw new Error('illegal access');
  }
  const rootFilePath = cookies['root']; //to be removed
  let taskIndex = cookies['index'];     //to be removed


  // set default view
  $('#listView').prop('checked', true);
  $('.workflow_manage_area').hide();
  $('#log_area').hide();


  // setup socket.io client
  const sioWF = io('/swf/workflow');
  const sioPJ = io('/swf/project');

  // setup FileBrowser
  const fb = new FileBrowser(sioWF, '#fileList', 'fileList', true);
  sioWF.on('connect', function () {
    //TODO workflowの箱をクリックした時に対応するPathのrequestを投げるようにする
    fb.request('fileListRequest', ClientUtility.dirname(projectFilePath), null);
  });

  // setup file uploader
  const uploader = new SocketIOFileUpload(sioWF);
  uploader.listenOnDrop(document.getElementById('fileBrowser'));
  uploader.listenOnInput(document.getElementById('fileSelector'));

  //setup log reciever
  logReciever(sioPJ);

  // show or hide log area
  var showLog = function () {
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight - logHeight);
    $('#log_area').show();
  };
  var hideLog = function () {
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight + logHeight);
    $('#log_area').hide();
  };
  $('#displayLog').change(function () {
    if ($('#displayLog').prop('checked')) {
      showLog();
    }
    else {
      hideLog();
    }
  });
  $('input[name=view]').change(function () {
    if ($('#listView').prop('checked')) {
      $('.project_manage_area').show();
    }
    else {
      $('.project_manage_area').hide();
    }
    if ($('#graphView').prop('checked')) {
      $('.workflow_manage_area').show();
    }
    else {
      $('.workflow_manage_area').hide();
    }
  });

});
