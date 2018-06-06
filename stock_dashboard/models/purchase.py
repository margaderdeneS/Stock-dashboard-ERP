# -*- coding: utf-8 -*-
from odoo import fields, models, api

class PurchaseOrderLine(models.Model):
    _inherit = "purchase.order.line"
    
    @api.model
    def get_product_information(self, order_by, direct, info_compare_type, datestart=None, dateto=None):
        cr = self._cr
        product_obj = self.env['product.product']
        where = ''
        if datestart and dateto:
            where += 'WHERE date_order BETWEEN %s AND %s' % (datestart, dateto)
        products_query = """SELECT DISTINCT product_id, pt.name as name, TRUNC(pt.list_price, 2), pp.default_code, pc.name, COALESCE(SUM(discount), 0) as discount, 
            TRUNC(AVG(price_unit), 2) as avg_price, TRUNC(SUM(price_subtotal), 2) as no_tax_price, TRUNC(SUM(price_unit * product_qty), 2) as price, 
            TRUNC(SUM(price_unit * product_qty) - SUM(price_subtotal), 2) as tax_price, TRUNC(SUM(product_qty), 2) as quantity 
            FROM purchase_order_line 
            LEFT JOIN product_product pp ON pp.id = product_id 
            LEFT JOIN product_template pt ON pt.id = pp.product_tmpl_id 
            LEFT JOIN product_category pc On pc.id = pt.categ_id 
            """+where+"""
            GROUP BY product_id, pt.name, pt.list_price, pc.name, pp.default_code 
            ORDER BY """+order_by+" "+direct
        cr.execute(products_query)
        products = cr.dictfetchall()
        product_ids = []
        products_label = []
        products_dataset = []
        for data in products:
            product = product_obj.browse(data['product_id'])
            product_ids.append(product.id)
            products_label.append(product.name if product else '')
            products_dataset.append(data[order_by])
        products_quant = self.env['stock.quant'].get_product_information(product_ids, datestart, dateto)
        products_quant_dataset = []
        for product_id in product_ids:
            find = False
            for quant in products_quant:
                if product_id == quant['product_id']:
                    products_quant_dataset.append(quant[order_by])
                    find = True
                    break
            if not find:
                products_quant_dataset.append(0.0)
        products_posibility_dataset = []
        if info_compare_type == 'medium':
            for x in range(0, len(product_ids)):
                products_posibility_dataset.append((products_dataset[x]+products_quant_dataset[x])/2)
        data = {
            'products': products,
            'products_label': products_label,
            'products_dataset': products_dataset,
            'products_quant': products_quant,
            'products_quant_dataset': products_quant_dataset,
            'products_posibility_dataset': products_posibility_dataset,
        }
        return data