# -*- coding: utf-8 -*-
import odoo
import datetime
from odoo import models, fields, api, _
from odoo.http import request
from datetime import datetime

class StockDashboard(models.Model):
    _name = 'stock.dashboard'
    _description = 'Stock Dashboard'
    
    selection_modules = [('pos.order.line','Pos products'),
                         ('sale.order.line','Sales products'),
                         ('purchase.order.line','Purchase products'),
                         ]#('mrp.production', 'Manufacturing')
    selection_types = [('quantity','Quantity'),
                       ('price','Price')]
    selection_route_types = [('desc', 'Desc'),
                   ('asc', 'Asc')]
    selection_compare_types = [('comparison', 'Comparison'),
                               ('medium', 'Medium'),
                               ('profit', 'Profit')]
    selection_qty = [('all','All'),
                     ('10','Top 10'),
                     ('5','Top 5'),
                     ('insert','Insert'),
                     ('choose','Choose')]
    
    name = fields.Char("Name")
    model_types = fields.Selection(selection_modules, index=True, required=True)
    types = fields.Selection(selection_types, index=True)
    compare_types = fields.Selection(selection_compare_types, index=True)
    route_types = fields.Selection(selection_route_types)
    quantity_types = fields.Selection(selection_qty)
    date_from = fields.Datetime(default=lambda *a: time.strftime('%Y-%m-%d H:M:S'))
    date_to = fields.Date(default=lambda *a: time.strftime('%Y-%m-%d H:M:S'))
    quantity = fields.Integer('Quantity')
    product_ids = fields.Many2many('product.product','stock_dashboard_product_product_rel','dashboard_id','product_id','Products')
    is_all_product = fields.Boolean('Is All', default=True)

    @api.onchange('model_types')
    def onchange_model_types(self):
        if self.model_types:
            self.onchange_is_all_product()
            product_ids = self.env[self.model_types].search([('product_id','!=',False)]).mapped('product_id')
            return {'domain': {'product_ids': [('id','in',product_ids.ids)]}}
    
    @api.onchange('is_all_product')
    def onchange_is_all_product(self):
        if self.is_all_product and self.model_types:
            # Боломжтой бүх барааг сонгох
            product_ids = self.env[self.model_types].search([('product_id','!=',False)]).mapped('product_id')
            self.product_ids = [(6, 0, product_ids.ids if product_ids else [])]
    
    @api.model
    def get_product_information(self, order_by, direct, info_compare_type, datestart=None, dateto=None):
        cr = self._cr
        pos_order_line_obj = self.env['pos.order.line']
        data = pos_order_line_obj.get_product_information(order_by, direct, info_compare_type, datestart, dateto)
        return data
    
#     @api.multi
#     def cron_process(self):
#         location_ids = self.env['stock.location'].search([('id','!=',[])])
#         if self.user_has_groups('base.group_no_one'):
#             company_ids = self.env.user.company_ids
#         else:
#             company_ids = self.env.user.company_id
#         # гарт байгаа тоо ширхэг
# #         select product_id, SUM(qty) as qty, AVG(inventory_value) from stock_quant GROUP BY product_id ORDER BY product_id;
#         # тооллогоос ирсэн дүн
# #         select si.date, sil.product_id, AVG(theoretical_qty) as theory_q, AVG(product_qty) as real_q from stock_inventory_line sil LEFT JOIN stock_inventory si ON (si.id = inventory_id) GROUP BY si.date, sil.product_id ORDER BY sil.product_id;
#         print '-------__> ',location_ids,company_ids
#         self._cr.execute("""SELECT sm.product_id, SUM(sm.product_qty) as product_qty, sm.inventory_id, sm.location_id, sm.location_dest_id, 
#                         mp.id as production_id, sm.purchase_line_id, sm.warehouse_id, sq.id as quant_id, sub.qty 
#                         FROM stock_move sm 
#                         LEFT JOIN mrp_production mp ON (mp.id = sm.production_id) 
#                         LEFT JOIN stock_quant sq ON (sm.id = sq.reservation_id) 
#                         LEFT JOIN (select product_id, sum(qty) as qty from stock_quant GROUP BY product_id ORDER by product_id) sub ON (sub.product_id = sm.product_id)
#                         WHERE sm.state = 'done' 
#                         GROUP BY sm.product_id, sm.inventory_id, sm.location_id, sm.location_dest_id, mp.id, sm.purchase_line_id, sm.warehouse_id, sq.id, sub.qty 
#                         ORDER BY sm.product_id;""")
#         info_lines = self._cr.dictfetchall()
#         product_obj = self.env['product.product']
#         production_obj = self.env['mrp.production']
#         pur_line_obj = self.env['purchase.order.line']
#         for info_line in info_lines:
#             product_id = product_obj.browse(info_line['product_id'])
#             history = ''
#             product_id.product_history = history
#             print '\nProduct id --> ',product_id
#             if info_line['production_id']:
#                 production_id = production_obj.browse(info_line['production_id'])
#                 if production_id:
#                     history += ('%s үйлдвэрлэлийн захиалгаас %s %s үүсгэгдсэн байна.\n' % (production_id.name, production_id.product_qty, production_id.product_uom_id.name))
#             if info_line['purchase_line_id']:
#                 purchase_line_id = pur_line_obj.browse(info_line['purchase_line_id'])
#                 if purchase_line_id:
#                     history += ('%s худалдан авалтын захиалгаас %s %s авсан байна.\n' % (purchase_line_id.name, purchase_line_id.qty_received, purchase_line_id.product_uom.name))
#             history += ('Гарт %s %s байна.\n' % (info_line['qty'], product_id.uom_id.name))
#             product_id.product_history = history
    
    
    