/**
 *
 */
interface JQuery {
    /**
     * highlight border of JQuery element border is invalid
     */
    borderInvalid: (() => JQuery);
    /**
     * highlight border of JQuery element border is valid
     */
    borderValid: (() => JQuery);
    /**
     * set text decoration underline
     */
    textDecorateUnderline: (() => JQuery);
    /**
     * set text decoration none
     */
    textDecorateNone: (() => JQuery);
    /**
     * get jquery element id
     */
    id: (() => string);
    /**
     * set class name
     */
    class: ((name: string) => JQuery);
    /**
     * set display block
     */
    displayBlock: (() => JQuery);
    /**
     * set display none
     */
    displayNone: (() => JQuery);
}

$.fn.extend({
    borderInvalid: function (): JQuery {
        const that = this;
        that.css('border', 'solid 1px rgb(250, 55, 20)');
        return that;
    },
    borderValid: function (): JQuery {
        const that = this;
        that.css('border', 'solid 1px #111');
        return that;
    },
    textDecorateUnderline: function (): JQuery {
        const that = this;
        that.css('text-decoration', 'underline');
        return that;
    },
    textDecorateNone: function (): JQuery {
        const that = this;
        that.css('text-decoration', 'none');
        return that;
    },
    id: function (): string {
        const that = this;
        return that.attr('id');
    },
    class: function (name: string): JQuery {
        const that = this;
        that.attr('class', name);
        return that;
    },
    displayBlock:  function (): JQuery {
        const that = this;
        that.css('display', 'block');
        return that;
    },
    displayNone:  function (): JQuery {
        const that = this;
        that.css('display', 'none');
        return that;
    }
});