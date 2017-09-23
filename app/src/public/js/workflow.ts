$(() => {
  var showLog=function(){
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight-logHeight);
    $('#log_area').show();
  }
  var hideLog=function(){
    var currentHeight = $('.sub_content_area').innerHeight();
    var logHeight = $('#log_area').outerHeight(true);
    $('.sub_content_area').innerHeight(currentHeight+logHeight);
    $('#log_area').hide();
  }

  $('.workflow_manage_area').hide();
  $('#log_area').hide();


  $('#displayLog').change(function(){
    if($('#displayLog').prop('checked')){
      showLog();
    }else{
      hideLog();
    }
  });

  $('input[name=view]').change(function(){
    if($('#listView').prop('checked')){
      $('.project_manage_area').show();
    }else{
      $('.project_manage_area').hide();
    }
    if($('#graphView').prop('checked')){
      $('.workflow_manage_area').show();
    }else{
      $('.workflow_manage_area').hide();
    }
  });
});

