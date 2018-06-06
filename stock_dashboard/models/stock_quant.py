# -*- coding: utf-8 -*-
from odoo import fields, models, api
# import odoo.addons.decimal_precision as dp

class StockQuant(models.Model):
    _inherit = "stock.quant"

    inventory_value = fields.Float('Inventory Value', compute='_compute_inventory_value', readonly=True, store=True)
    
    @api.model
    def get_product_information(self, product_ids, datestart=None, dateto=None):
        cr = self._cr
        product_obj = self.env['product.product']
        where = ''
        if product_ids:
            where += 'WHERE product_id in %s' % (tuple(product_ids),)
        if datestart and dateto:
            where += 'AND in_date BETWEEN %s AND %s' % (str(datestart), str(dateto))
        products_query = """SELECT DISTINCT product_id, pt.name as name, TRUNC(pt.list_price, 2) as price, pp.default_code, 
            AVG(cost) as cost_price, SUM(inventory_value) as inventory_value, 
            SUM(qty) as quantity 
            FROM stock_quant  
            LEFT JOIN product_product pp ON pp.id = product_id 
            LEFT JOIN product_template pt ON pt.id = pp.product_tmpl_id 
            LEFT JOIN product_category pc On pc.id = pt.categ_id 
            """+where+"""
            GROUP BY product_id, pt.name, pt.list_price, pp.default_code 
            ORDER BY product_id ASC"""
        print '\n>>>>>>>>>>>>>>> ',products_query
        cr.execute(products_query)
        products = cr.dictfetchall()
        return products
    
    @api.multi
    def _compute_inventory_value(self):
        for quant in self:
            if quant.company_id != self.env.user.company_id:
                # if the company of the quant is different than the current user company, force the company in the context
                # then re-do a browse to read the property fields for the good company.
                quant = quant.with_context(force_company=quant.company_id.id)
            quant.inventory_value = quant.product_id.standard_price * quant.qty