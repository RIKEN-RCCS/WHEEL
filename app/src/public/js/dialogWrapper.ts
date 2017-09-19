function dialogWrapper(dialogID, html){
  var def=$.Deferred();
  $(dialogID).html(html).dialog({
    autoOpen: false,
    draggable: false,
    resizable: false,
    modal: true,
    buttons:{
    "OK":function(){
        def.resolve();
        $(this).dialog('close');
      },
      "Cancel": function(){
        def.reject();
        $(this).dialog('close');
      }
    }
  });
  $('.ui-dialog-titlebar').css({display: 'none'});
  $(dialogID).dialog('open');
  return def.promise();
}
