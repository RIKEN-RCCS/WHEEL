import $ from 'jquery';
import 'jquery-ui/ui/widgets/dialog';

import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/dialog.css';

export default function (message, options) {
  const html = `<p class="dialogTitle">Error</p><p class="dialogTextbox">${message}</p>`
  const dialogID = '#dialog';
  var def = $.Deferred();
  $(dialogID).html(html).dialog({
    autoOpen: false,
    draggable: false,
    resizable: false,
    modal: true,
    width: 'auto',
    height: 'auto',
    buttons: {
      "OK": function () {
        def.resolve();
        $(this).dialog('close');
      }
    }
  });
  if (options != null) $(dialogID).dialog('option', options);
  $('.ui-dialog-titlebar').css({ display: 'none' });
  $(dialogID).dialog('open');
  return def.promise();
}
