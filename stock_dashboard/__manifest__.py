# -*- coding: utf-8 -*-
{
    'name': 'Mongolian Stock Dashboard',
    'version': '1.0',
    'category': "Bachelor degree's research",
    'author': 'Sumbaa Margad-Erdene erp developer of Asterisk Technologies LLC',
    'maintainer': 'margad-erdene@asterisk-tech.mn',
    'website': 'http://asterisk-tech.mn',
    'description': """
        Stock Dashboard
    """,
    'depends': ['l10n_mn_base', 
#                 'website_sale', 
                'l10n_mn_stock',
                'point_of_sale',
                'purchase',
                'sale',
#                 'l10n_mn_sale_plan',
#                 'l10n_mn_sale_stock'
                ],
    'data': [
        'security/ir.model.access.csv',
        'views/product_template.xml',
        'views/stock_dashboard_view.xml',
#         'product_cron.xml',
#         'views/stock_dashboard_form.xml',
    ],
    'qweb': [
        "static/src/xml/stock_dashboard.xml",
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
}
