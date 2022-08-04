# Copyright 2014 Therp BV (<http://therp.nl>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "Preview attachments",
    "version": "15.0.1.0.0",
    "author": "Therp BV," "Onestein," "Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/knowledge",
    "license": "AGPL-3",
    "summary": "Preview attachments supported by Viewer.js",
    "category": "Knowledge Management",
    "depends": ["web", "mail"],
    "data": [
        # "views/assets.xml",
    ],
    "qweb": [
        # "static/src/xml/attachment_preview.xml",
    ],
    'assets': {
        'web._assets_primary_variables': [
            # 'account/static/src/scss/variables.scss',
        ],
        'web.assets_backend': [
            # 'attachment_preview/static/src/js/attachment_preview.js',
            'attachment_preview/static/src/js/models/attachment_card/attachment_card.js',
            'attachment_preview/static/src/js/attachmentPreviewWidget.js',
            'attachment_preview/static/src/js/components/chatter/chatter.js',
            'attachment_preview/static/src/scss/attachment_preview.scss',
            'attachment_preview/static/src/scss/mixins.scss',
        ],
        'web.assets_frontend': [
            # 'account/static/src/js/account_portal_sidebar.js',
        ],
        'web.assets_tests': [
            # 'account/static/tests/tours/**/*',
        ],
        'web.qunit_suite_tests': [
            # ('after', 'web/static/tests/legacy/views/kanban_tests.js', 'account/static/tests/account_payment_field_tests.js'),
            # ('after', 'web/static/tests/legacy/views/kanban_tests.js', 'account/static/tests/section_and_note_tests.js'),
        ],
        'web.assets_qweb': [
            # 'account/static/src/xml/**/*',
            'attachment_preview/static/src/xml/attachment_preview.xml',
        ],
    },
    "installable": True,
}
