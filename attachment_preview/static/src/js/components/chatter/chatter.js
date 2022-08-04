/** @odoo-module **/

import {Chatter} from "@mail/components/chatter/chatter";

import {patch} from "web.utils";
import AttachmentPreviewWidget from "../../attachmentPreviewWidget";

const components = {Chatter};
var rpc = require("web.rpc");

var chatterpreviewableAttachments = [];

function getUrl(attachment_id, attachment_url, attachment_extension, attachment_title) {
    if (attachment_url) {
        if (attachment_url.slice(0, 21) === "/web/static/lib/pdfjs") {
            var url = (window.location.origin || "") + attachment_url;
        } else {
            var url =
                (window.location.origin || "") +
                "/attachment_preview/static/lib/ViewerJS/index.html" +
                "?type=" +
                encodeURIComponent(attachment_extension) +
                "&title=" +
                encodeURIComponent(attachment_title) +
                "#" +
                attachment_url.replace(window.location.origin, "");
        }
        return url;
    } else {
        var url =
            (window.location.origin || "") +
            "/attachment_preview/static/lib/ViewerJS/index.html" +
            "?type=" +
            encodeURIComponent(attachment_extension) +
            "&title=" +
            encodeURIComponent(attachment_title) +
            "#" +
            "/web/content/" +
            attachment_id +
            "?model%3Dir.attachment";
    }
}

function canPreview(extension) {
    return (
        $.inArray(extension, [
            "odt",
            "odp",
            "ods",
            "fodt",
            "pdf",
            "ott",
            "fodp",
            "otp",
            "fods",
            "ots",
            // "webm",
            // "mp4",
            // "mp3",
        ]) > -1
    );
}

// var AttachmentPreviewWidget = Widget.extend({
//     template: "attachment_preview.AttachmentPreviewWidget",
//     activeIndex: 0,

//     events: {
//         "click .attachment_preview_close": "_onCloseClick",
//         "click .attachment_preview_previous": "_onPreviousClick",
//         "click .attachment_preview_next": "_onNextClick",
//         "click .attachment_preview_popout": "_onPopoutClick",
//     },

//     start: function () {
//         first_click = true;
//         var res = this._super.apply(this, arguments);
//         this.$overlay = $(".attachment_preview_overlay");
//         this.$iframe = $(".attachment_preview_iframe");
//         this.$current = $(".attachment_preview_current");
//         return res;
//     },

//     _onCloseClick: function () {
//         this.hide();
//     },

//     _onPreviousClick: function () {
//         this.previous();
//     },

//     _onNextClick: function () {
//         this.next();
//     },

//     _onPopoutClick: function () {
//         if (!this.attachments[this.activeIndex]) {
//             return;
//         }

//         window.open(this.attachments[this.activeIndex].previewUrl);
//     },

//     next: function () {
//         // first_click = false
//         var index = this.activeIndex + 1;
//         if (index >= this.attachments.length) {
//             index = 0;
//         }
//         this.activeIndex = index;
//         this.updatePaginator();
//         this.loadPreview();
//     },

//     previous: function () {
//         var index = this.activeIndex - 1;
//         if (index < 0) {
//             index = this.attachments.length - 1;
//         }
//         this.activeIndex = index;
//         this.updatePaginator();
//         this.loadPreview();
//     },

//     show: function () {
//         this.$el.removeClass("d-none");
//         this.trigger("shown");
//     },

//     hide: function () {
//         first_click = true;
//         this.$el.addClass("d-none");
//         this.trigger("hidden");
//     },

//     updatePaginator: function () {
//         var value = _.str.sprintf(
//             "%s / %s",
//             this.activeIndex + 1,
//             this.attachments.length
//         );
//         this.$overlay = $(".attachment_preview_overlay");
//         this.$iframe = $(".attachment_preview_iframe");
//         this.$current = $(".attachment_preview_current");
//         this.$current.html(value);
//     },

//     loadPreview: function () {
//         if (this.attachments.length === 0) {
//             this.$iframe.attr("src", "about:blank");
//             return;
//         }

//         if (first_click) {
//             for (let i = 0; i < this.attachments.length; i++) {
//                 if (this.attachments[i].id === active_attachment_id.toString()) {
//                     active_attachment_index = i;
//                     first_click = false;
//                 }
//             }
//         } else {
//             active_attachment_index = this.activeIndex;
//         }

//         var att = this.attachments[active_attachment_index];
//         this.$iframe.attr("src", att.previewUrl);
//     },

//     setAttachments: function (attachments) {
//         if (attachments) {
//             this.attachments = attachments;
//             this.activeIndex = 0;
//             this.updatePaginator();
//             this.loadPreview();
//         }
//     },
// });

patch(
    components.Chatter.prototype,
    "attachment_preview/static/src/js/components/chatter/chatter.js",
    {
        /**
         * @override
         */
        constructor(...args) {
            this._super(...args);

            this._showPreview = this._showPreview.bind(this);
            this.canPreview = this.canPreview.bind(this);
        },

        _showPreview(
            attachment_id,
            attachment_url,
            attachment_extension,
            attachment_title,
            split_screen
        ) {
            var url = getUrl(
                attachment_id,
                attachment_url,
                attachment_extension,
                attachment_title
            );
            if (split_screen) {
                this.trigger("onAttachmentPreview", {url: url});
            } else {
                window.open(url);
            }
        },

        /**
         * @override
         */
        _update() {
            var res = this._super.apply(this, arguments);
            var self = this;
            self._getPreviewableAttachments().then(
                function (atts) {
                    self.previewableAttachments = atts;
                    // this.updatePreviewButtons(this.previewableAttachments);
                    self._updatePreviewButtons(self.previewableAttachments);
                    if (!self.attachmentPreviewWidget) {
                        self.attachmentPreviewWidget = new AttachmentPreviewWidget(
                            self
                        );
                        self.attachmentPreviewWidget.setAttachments(atts);
                    }
                    self.previewableAttachments = atts;
                    chatterpreviewableAttachments = atts;
                    self.attachmentPreviewWidget.setAttachments(atts);
                }.bind(self)
            );
        },

        _getPreviewableAttachments: function () {
            var self = this;
            var deferred = $.Deferred();
            var $items = $(".o_attachment_preview");

            const chatter = this.messaging.models["mail.chatter"].get(
                this.props.chatterLocalId
            );
            const thread = chatter ? chatter.thread : undefined;
            if (thread) {
                attachments = thread.allAttachments;
            }

            var attachments = _.object(
                attachments.map((attachment) => {
                    // return parseInt(attachment.localId.slice(16), 10);
                    return parseInt(attachment.localId.slice(20).slice(0, -1));
                }),
                attachments.map((attachment) => {
                    if (attachment.defaultSource) {
                        return {
                            url: attachment.defaultSource,
                            extension: attachment.extension,
                            title: attachment.name,
                        };
                    } else {
                        return {
                            url: "/web/content?id=" + attachment.id + "&download=true",
                            extension: attachment.extension,
                            title: attachment.name,
                        };
                    }
                })
            );

            rpc.query({
                model: "ir.attachment",
                method: "get_attachment_extension",
                args: [
                    _.map(_.keys(attachments), function (id) {
                        return parseInt(id, 10);
                    }),
                ],
            }).then(
                function (extensions) {
                    var reviewableAttachments = _.map(
                        _.keys(
                            _.pick(extensions, function (extension) {
                                return canPreview(extension);
                            })
                        ),
                        function (id) {
                            return {
                                id: id,
                                url: attachments[id].url,
                                extension: extensions[id],
                                title: attachments[id].title,
                                previewUrl: getUrl(
                                    id,
                                    attachments[id].url,
                                    extensions[id],
                                    attachments[id].title
                                ),
                            };
                        }
                    );
                    deferred.resolve(reviewableAttachments);
                },

                function () {
                    deferred.reject();
                }
            );
            return deferred.promise();
        },

        _updatePreviewButtons: function (previewableAttachments) {
            $(this)
                .find(".o_attachment_preview")
                .each(function () {
                    var $this = $(this);
                    var att = _.findWhere(previewableAttachments, {
                        id: $this.attr("data-id"),
                    });
                    if (att) {
                        $this.attr("data-extension", att.extension);
                    } else {
                        $this.remove();
                    }
                });
        },
    }
);
