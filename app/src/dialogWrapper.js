import $ from 'jquery';
import 'jquery-ui/dialog';

export default function(dialogID, html, options) {
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
            },
            "Cancel": function () {
                def.reject();
                $(this).dialog('close');
            }
        }
    });
    if (options != null)
        $(dialogID).dialog('option', options);
    $('.ui-dialog-titlebar').css({ display: 'none' });
    $(dialogID).dialog('open');
    return def.promise();
}
