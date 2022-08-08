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
        ]) > -1
    );
}

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

        /**
         * @private
         */
        _showPreview(
            attachment_id,
            attachment_url,
            attachment_extension,
            attachment_title,
            split_screen
        ) {
            let active_attURL = "";
            this.attachmentList.attachments.forEach((att) => {
                if (parseInt(att.localId.slice(20).slice(0, -1)) === attachment_id) {
                    if (att.__values.url === undefined) {
                        att.__values.url = attachment_url.slice(
                            window.location.origin.length
                        );
                        active_attURL = att.__values.url;
                    }
                }
            });
            var url = getUrl(
                attachment_id,
                attachment_url,
                attachment_extension,
                attachment_title
            );
            if (split_screen) {
                this.component.trigger("onAttachmentPreview", {
                    url: url,
                    active_attachment_id: active_attachment_id,
                });
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
                    return attachment.id;
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
                        return parseInt(id);
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
