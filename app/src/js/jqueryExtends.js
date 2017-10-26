import $ from 'jquery';
$.fn.extend({
    borderInvalid: function () {
        const that = this;
        that.css('border', 'solid 1px rgb(250, 55, 20)');
        return that;
    },
    borderValid: function () {
        const that = this;
        that.css('border', 'solid 1px #111');
        return that;
    },
    textDecorateUnderline: function () {
        const that = this;
        that.css('text-decoration', 'underline');
        return that;
    },
    textDecorateNone: function () {
        const that = this;
        that.css('text-decoration', 'none');
        return that;
    },
    id: function () {
        const that = this;
        return that.attr('id');
    },
    class: function (name) {
        const that = this;
        that.attr('class', name);
        return that;
    },
    displayBlock: function () {
        const that = this;
        that.css('display', 'block');
        return that;
    },
    displayNone: function () {
        const that = this;
        that.css('display', 'none');
        return that;
    }
});
