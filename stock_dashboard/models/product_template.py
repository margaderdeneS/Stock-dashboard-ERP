# -*- coding: utf-8 -*-
from odoo import fields, models, api

class ProductTemplate(models.Model):
    _inherit = "product.template"
    
    def _default_product_history(self):
        return "Ямар нэгэн үйл ажиллагаа байхгүй байна."

    product_history = fields.Text('History of product', readonly=True, store=True, default=_default_product_history)