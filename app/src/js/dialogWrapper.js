import $ from 'jquery';
import 'jquery-ui/ui/widgets/dialog';

import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/dialog.css';

export default function (dialogID, html, options) {
    var def = $.Deferred();
    $(dialogID).html(html).dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        modal: true,
        width: 'auto',
        height: 'auto',
        buttons: [
            {
                text: 'Cancel',
                class: 'cancelButton',
                click: function () {
                    def.reject();
                    $(this).dialog('close');
                }
            },
            {
                text: 'OK',
                class: 'okButton',
                click: function () {
                    def.resolve();
                    $(this).dialog('close');
                }
            }
        ]
    });
    //Enter key event
    $(dialogID).keypress(function (e) {
        if (e.which == 13) {
            def.resolve();
            $(this).dialog('close');
        }
    });
    if (options != null) $(dialogID).dialog('option', options);
    $(dialogID).dialog('open');
    return def.promise();
}
