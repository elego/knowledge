/** @odoo-module **/
const { Component } = owl;
const { useState } = owl.hooks;

import FormRenderer from 'web.FormRenderer';
import Chatter from '@mail/components/chatter/chatter'
import '@mail/components/chatter_container/chatter_container';
import AttachmentCard from '@mail/models/attachment_card/attachment_card'


import {
    registerClassPatchModel,
    registerInstancePatchModel,
    registerFieldPatchModel
} from'@mail/model/model_core';



// odoo.define(
//     "/attachment_preview/static/src/js/attachment_preview.js",
    // function (require) {
        "use strict";
        const components = {
            // Attachment: require("mail/static/src/components/attachment/attachment.js"),
            // Chatter: require("mail/static/src/components/chatter/chatter.js"),
            // ChatterContainer: require("mail/static/src/components/chatter_container/chatter_container.js"),
        };
        const {patch} = require("web.utils");
        var rpc = require("web.rpc");
        var basic_fields = require("web.basic_fields");
        var FormRenderer = require("web.FormRenderer");
        var Widget = require("web.Widget");
        var core = require("web.core");
        var _t = core._t;

        var chatterpreviewableAttachments = [];
        var active_attachment_id = 0;
        var active_attachment_index = 0;
        var first_click = true;

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

        function getUrl(
            attachment_id,
            attachment_url,
            attachment_extension,
            attachment_title
        ) {
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

        const attachment = patch(
            'mail.attachment_card',
            "mail/static/src/models/attachment_card/attachment_card.js",
            {
                events: _.extend({}, Chatter.prototype.events, {
                    "click .o_attachment_preview": "_onPreviewAttachment",
                }),

                showPreview(
                    attachment_id,
                    attachment_url,
                    attachment_extension,
                    attachment_title,
                    split_screen
                ) {
                    let active_attURL = "";
                    chatterpreviewableAttachments.forEach((att) => {
                        if (parseInt(att.id) === attachment_id) {
                            if (att.url === undefined) {
                                att.url = attachment_url.slice(
                                    window.location.origin.length
                                );
                                active_attURL = att.url;
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
                        this.trigger("onAttachmentPreview", {url: url});
                    } else {
                        window.open(url);
                    }
                },

                _onPreviewAttachment(event) {
                    event.preventDefault();
                    var self = this,
                        $target = $(event.currentTarget),
                        split_screen = $target.attr("data-target") !== "new",
                        attachment_id = parseInt($target.attr("data-id"), 10),
                        attachment_extension = "pdf",
                        attachment_title = $target.attr("data-original-title"),
                        attachment_url = this.attachmentUrl;
                    active_attachment_id = attachment_id;

                    if (attachment_extension) {
                        this.showPreview(
                            attachment_id,
                            attachment_url,
                            attachment_extension,
                            attachment_title,
                            split_screen
                        );
                    } else {
                        rpc.query({
                            model: "ir.attachment",
                            method: "get_attachment_extension",
                            args: [attachment_id],
                        }).then(function (extension) {
                            this.showPreview(
                                attachment_id,
                                attachment_url,
                                extension,
                                null,
                                split_screen
                            );
                        });
                    }
                },
            }
        );

        var AttachmentPreviewWidget = Widget.extend({
            template: "attachment_preview.AttachmentPreviewWidget",
            activeIndex: 0,

            events: {
                "click .attachment_preview_close": "_onCloseClick",
                "click .attachment_preview_previous": "_onPreviousClick",
                "click .attachment_preview_next": "_onNextClick",
                "click .attachment_preview_popout": "_onPopoutClick",
            },

            start: function () {
                first_click = true;
                var res = this._super.apply(this, arguments);
                this.$overlay = $(".attachment_preview_overlay");
                this.$iframe = $(".attachment_preview_iframe");
                this.$current = $(".attachment_preview_current");
                return res;
            },

            _onCloseClick: function () {
                this.hide();
            },

            _onPreviousClick: function () {
                this.previous();
            },

            _onNextClick: function () {
                this.next();
            },

            _onPopoutClick: function () {
                if (!this.attachments[this.activeIndex]) {
                    return;
                }

                window.open(this.attachments[this.activeIndex].previewUrl);
            },

            next: function () {
                // first_click = false
                var index = this.activeIndex + 1;
                if (index >= this.attachments.length) {
                    index = 0;
                }
                this.activeIndex = index;
                this.updatePaginator();
                this.loadPreview();
            },

            previous: function () {
                var index = this.activeIndex - 1;
                if (index < 0) {
                    index = this.attachments.length - 1;
                }
                this.activeIndex = index;
                this.updatePaginator();
                this.loadPreview();
            },

            show: function () {
                this.$el.removeClass("d-none");
                this.trigger("shown");
            },

            hide: function () {
                first_click = true;
                this.$el.addClass("d-none");
                this.trigger("hidden");
            },

            updatePaginator: function () {
                var value = _.str.sprintf(
                    "%s / %s",
                    this.activeIndex + 1,
                    this.attachments.length
                );
                this.$overlay = $(".attachment_preview_overlay");
                this.$iframe = $(".attachment_preview_iframe");
                this.$current = $(".attachment_preview_current");
                this.$current.html(value);
            },

            loadPreview: function () {
                if (this.attachments.length === 0) {
                    this.$iframe.attr("src", "about:blank");
                    return;
                }

                if (first_click) {
                    for (let i = 0; i < this.attachments.length; i++) {
                        if (
                            this.attachments[i].id === active_attachment_id.toString()
                        ) {
                            active_attachment_index = i;
                            first_click = false;
                        }
                    }
                } else {
                    active_attachment_index = this.activeIndex;
                }

                var att = this.attachments[active_attachment_index];
                this.$iframe.attr("src", att.previewUrl);
            },

            setAttachments: function (attachments) {
                if (attachments) {
                    this.attachments = attachments;
                    this.activeIndex = 0;
                    this.updatePaginator();
                    this.loadPreview();
                }
            },
        });

        const chatter = patch(
                Chatter,
            "mail/static/src/components/chatter/chatter.js",
            {
                showPreview(
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

                _update() {
                    var self = this;
                    self.getPreviewableAttachments().done(
                        function (atts) {
                            this.previewableAttachments = atts;
                            // this.updatePreviewButtons(this.previewableAttachments);
                            this.updatePreviewButtons(this.previewableAttachments);
                            if (!this.attachmentPreviewWidget) {
                                this.attachmentPreviewWidget =
                                    new AttachmentPreviewWidget(this);
                                this.attachmentPreviewWidget.setAttachments(atts);
                            }
                            this.previewableAttachments = atts;
                            chatterpreviewableAttachments = atts;
                            this.attachmentPreviewWidget.setAttachments(atts);
                        }.bind(this)
                    );
                },

                getPreviewableAttachments: function () {
                    var self = this;
                    var deferred = $.Deferred();
                    var $items = $(".o_attachment_preview");

                    const chatter = this.env.models["mail.chatter"].get(
                        this.props.chatterLocalId
                    );
                    const thread = chatter ? chatter.thread : undefined;
                    if (thread) {
                        attachments = thread.allAttachments;
                    }

                    var attachments = _.object(
                        attachments.map((attachment) => {
                            return parseInt(attachment.localId.slice(16), 10);
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
                                    url:
                                        "/web/content?id=" +
                                        attachment.id +
                                        "&download=true",
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

                updatePreviewButtons: function (previewableAttachments) {
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

        basic_fields.FieldBinaryFile.include(Chatter);
        basic_fields.FieldBinaryFile.include({
            showPreview(
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

            _renderReadonly: function () {
                var self = this;
                this._super.apply(this, arguments);

                if (this.recordData.id) {
                    this._getBinaryExtension().then(function (extension) {
                        if (canPreview(extension)) {
                            // self._renderPreviewButton(extension, recordData);
                            self._renderPreviewButton(extension);
                        }
                    });
                }
            },

            _renderPreviewButton: function (extension) {
                this.$previewBtn = $("<a/>");
                this.$previewBtn.addClass("fa fa-external-link mr-2");
                this.$previewBtn.attr("href");
                this.$previewBtn.attr(
                    "title",
                    _.str.sprintf(_t("Preview %s"), this.field.string)
                );
                this.$previewBtn.attr("data-extension", extension);
                this.$el.find(".fa-download").after(this.$previewBtn);
                this.$previewBtn.on("click", this._onPreview.bind(this));
            },

            _getBinaryExtension: function () {
                return rpc.query({
                    model: "ir.attachment",
                    method: "get_binary_extension",
                    args: [
                        this.model,
                        this.recordData.id,
                        this.name,
                        this.attrs.filename,
                    ],
                });
            },

            _onPreview: function (event) {
                this.showPreview(
                    null,
                    _.str.sprintf(
                        "/web/content?model=%s&field=%s&id=%d",
                        this.model,
                        this.name,
                        this.recordData.id
                    ),
                    $(event.currentTarget).attr("data-extension"),
                    _.str.sprintf(_t("Preview %s"), this.field.string),
                    false
                    // true
                );
                event.stopPropagation();
            },
        });

        FormRenderer.include({
            custom_events: _.extend({}, FormRenderer.prototype.custom_events, {
                onAttachmentPreview: "_onAttachmentPreview",
            }),
            attachmentPreviewWidget: null,

            init: function (parent, state, params) {
                var res = this._super(...arguments);
                this.attachmentPreviewWidget = new AttachmentPreviewWidget(this);
                this.attachmentPreviewWidget.on(
                    "hidden",
                    this,
                    this._attachmentPreviewWidgetHidden
                );
                return res;
            },

            start: function () {
                this._super.apply(this, arguments);
                this.attachmentPreviewWidget.insertAfter(this.$el);
            },

            _attachmentPreviewWidgetHidden: function () {
                this.$el.removeClass("attachment_preview");
            },

            showAttachmentPreviewWidget: function () {
                this.$el.addClass("attachment_preview");
                this.chatterpreviewableAttachments = chatterpreviewableAttachments;
                this.attachmentPreviewWidget.setAttachments(
                    chatterpreviewableAttachments
                );
                this.attachmentPreviewWidget.show();
            },

            on_detach_callback: function () {
                this.attachmentPreviewWidget.hide();
                return this._super.apply(this, arguments);
            },

            _onAttachmentPreview: function () {
                this.showAttachmentPreviewWidget();
            },
        });

        return {
            // attachment,
            chatter,
            AttachmentPreviewWidget: AttachmentPreviewWidget,
        };
    // }
// );
