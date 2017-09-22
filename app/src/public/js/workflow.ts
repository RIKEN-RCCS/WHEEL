$(() => {
  var showLog=function(){
    $('#log_area').show();
  }
  var hideLog=function(){
    $('#log_area').hide();
  }

  $('#displayLog').button();
  $('#displayLog').change(function(){
    if($('#displayLog').prop('checked')){
      showLog();
    }else{
      hideLog();
    }
  });
});

