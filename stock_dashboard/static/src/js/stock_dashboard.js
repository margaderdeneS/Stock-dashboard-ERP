/* Агуулахын дэлгэц 
** stopPropagation() - event-г parent-үүдэд хүрэхээс сэргийлж зогсооно. bubble үед
** preventDefault() - event-г цуцлах боломжтой бол default-р хийгддэг үйлдлийг нь зогсооно
**
**
** 
*/
odoo.define('stock_dashboard.dashboard', function (require) {
"use strict";

var core = require('web.core');
var formats = require('web.formats');
var Model = require('web.Model');
var session = require('web.session');

var KanbanView = require('web_kanban.KanbanView');

var ajax = require('web.ajax');

var KanbanRecord = require('web_kanban.Record');
var ActionManager = require('web.ActionManager');
var ControlPanelMixin = require('web.ControlPanelMixin');
var Widget = require('web.Widget');
var Notification = require('web.notification');
var data = require('web.data');
var FormView = require('web.FormView');
var QWeb = core.qweb;
var FieldSelection = core.form_widget_registry.get('selection');

var _t = core._t;
var _lt = core._lt;

// глобал хувьсагчууд default-р хамгийн эхний утга харагдах тул шууд оноох
var model_name, info_type, route_type, info_compare_type, graph_type, qty_type, quantity, selected_rows, datestart, dateto;

var StockDashboardKanbanView = KanbanView.extend({
    display_name: _lt('Dashboard'),
    icon: 'fa-dashboard text-red',
    //  Шүүлтүүр, бүлэглэх, эрхэм зэрэг хайлт хийдэг bar-г нуух
    searchview_hidden: true,
    events: {
        'click .o_dashboard_action': 'on_dashboard_action_clicked',
        'click #insert_button' : 'on_insert_button_action_clicked',
        'click #check_info' : 'on_clicked_product_info',
        'click #datetimePickerStart' : 'on_clicked_datetime',
        'click .datetimePicker' : 'on_clicked_datetime',
        // 'click .pos_order_lines': 'action_pos_order_lines',
    },
    xmlDependencies: ['stock_dashboard/static/src/xml/stock_dashboard.xml'],
    /* Амьдралын цикл */
    init: function (parent, dataset, view_id, options) {
        this._super(parent, dataset, view_id, options);
        // үүсгэх үйлдлийг идэвхгүй болгох
        this.options.creatable = false;
        // системд нэвтэрсэн хэрэглэгч
        var uid = dataset.context.uid;
        // бараануудын мэдээллийг хадгалах обьект
        var product_info = true;
        // model сонгох обьект
        var field_model_types, field_types, field_quantity_types, field_compare_types, field_route_types;
        var isFirefox = false;
        // хөгжүүлэлтэнд туслах обьект
        var is_first;
        // $('#datetimePickerStart').datepicker();
        $("#datetimePickerStart").datepicker().datepicker("setDate", new Date());
        $("#datetimePickerTo").datepicker().datepicker("setDate", new Date());
    },
    start: function() {
        var self = this;
        return self._super().then(function() {
            /* Selection утгууд солигдох үед харгалзах сонгогдсон утгыг хадгалах */
            self.$el.on('change', '#o_model_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                model_name = option;
                return self.render();
            });
            self.$el.on('change', '#o_type_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                info_type = option;
                return self.render();
            });
            self.$el.on('change', '#o_type_route_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                route_type = option;
                return self.render();
            });
            self.$el.on('change', '#o_compare_type_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                info_compare_type = option;
                // Харьцуулалт
                return self.render();
            });
            self.$el.on('change', '#o_graph_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                graph_type = option;
                return self.render();
            });
            self.$el.on('change', '#o_quantity_type_selection', function(ev) {
                var option = $(ev.target).find(":selected").val();
                qty_type = option;
                if (qty_type == 'insert') {self.$('.hide_input').show(); self.$('.hide_button').show();}
                else if (qty_type == 'choose') {
                    self.$('.hide_input').hide(); 
                    self.$('.hide_details').show(); 
                    self.$('.hide_button').show();
                    self.drawTable();
                }
                else return self.render()
            });
        });
    },
    /*****************/
    render: function() {
        var self = this;
        if(self.is_first == undefined) self.is_first = true
        else if(self.is_first) self.is_first = false
        // мэдээллийг харуулах төрлөөсөө хамаарч sort-лох
        if (!model_name || !info_type || !graph_type){
            model_name = 'stock.dashboard'
            info_type = 'quantity'
            route_type = 'desc'
            graph_type = 'bar'
            qty_type = 'all'
            info_compare_type = 'comparison'
            let now = new Date();
            let day = ("0" + now.getDate()).slice(-2);
            let month = ("0" + (now.getMonth() + 1)).slice(-2);
            let today = (day)+"-"+(month)+"-"+ now.getFullYear();
            console.log('Today ',today)
            $('#datetimePickerTo').value = today;
        }
        var super_render = this._super;
        return new Model(model_name).call('get_product_information', [info_type, route_type, info_compare_type]).then(function(result){
            self.isFirefox = typeof InstallTrigger !== 'undefined';
            self.product_info =  result
            self.field_model_types = self.fields.model_types
            self.field_types = self.fields.types
            self.field_compare_types = self.fields.compare_types
            self.field_quantity_types = self.fields.quantity_types
            self.field_route_types = self.fields.route_types
            console.log('-=====> ',qty_type)
            if (qty_type == undefined || qty_type == 'all') quantity = result.products.length
            else if (qty_type != 'insert') quantity = parseInt(qty_type)
            return self.fetch_data().then(function(result){
                var stock_dashboard = QWeb.render('stock_dashboard.dashboard', {
                    widget: self,
                });
                // шинээр зурах
                super_render.call(self);
                $(stock_dashboard).prependTo(self.$el);
                // сонгогдсон утгуудыг дахин оноох
                if (!self.is_first){
                    if (model_name != 'stock.dashboard')$("#o_model_selection").val(model_name)
                    $("#o_type_selection").val(info_type)
                    $("#o_type_route_selection").val(route_type)
                    $("#o_graph_selection").val(graph_type)
                    $("#o_quantity_type_selection").val(qty_type)
                    $("#o_compare_type_selection").val(info_compare_type)
                    if(qty_type == 'insert') $("#input_quantity").val(quantity)
                }
                if (qty_type != 'insert') self.$('.hide_input').hide()
                if (qty_type != 'choose') self.$('.hide_details').hide()
                if (qty_type != 'insert' && qty_type != 'choose') self.$('.hide_button').hide()
                if (qty_type == 'choose') self.drawTable();
                console.log('Slece row ',selected_rows)
                self.graph()
            });
        });
    },
    restart: function(mode) {
        console.log('REstart')
    },
    fetch_data: function() {
        // Overwrite this function with useful data
        console.log('Fetch data')
        return $.when();
    },
    // chart-н өнгийг random байдлаар сонгох
    getRandomColor: function () {
        var letters = '0123456789ABCDEF'.split('');
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },
    drawBarChart: function (info) {
        var self = this
        var barChart = this.$el.find('#customChart')
        var color = Chart.helpers.color
        Chart.plugins.register({
          beforeDraw: function(chartInstance) {
            var barChart = chartInstance.chart.ctx;
            barChart.fillStyle = "white";
            barChart.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
          }
        });
        var bg_color_list = []
        for (var i=0;i<=quantity;i++){
            bg_color_list.push(self.getRandomColor())
        }
        var bg_alpha_color_list = []
        for (var i=0;i<=bg_color_list.length;i++){
            bg_alpha_color_list.push(color(bg_color_list[i]).alpha(0.5).rgbString())
        }
        var max_p = Math.max.apply(null, info.products_dataset.slice(0, quantity));
        var max_q = Math.max.apply(null, info.products_quant_dataset.slice(0, quantity));
        var maxx;
        if(info_compare_type == 'medium'){
            var list = [{
                    label: 'Top '+quantity+' products',
                    data: info.products_dataset.slice(0, quantity),
                    backgroundColor: bg_color_list,
                    borderColor: bg_color_list,
                    borderWidth: 1,
                    pointBorderColor: 'white',
                    pointBackgroundColor: 'red',
                    pointRadius: 5,
                    pointHoverRadius: 10,
                    pointHitRadius: 30,
                    pointBorderWidth: 2,
                    pointStyle: 'rectRounded'
                },{
                    label: 'Top '+quantity+' quant products',
                    backgroundColor: bg_alpha_color_list,
                    data: info.products_quant_dataset.slice(0, quantity),
                },{label: "Posibility",
                    type: "line",
                    borderColor: "#d90026",
                    data: info.products_posibility_dataset.slice(0, quantity),
                    fill: false}];
        }else{
            var list = [{
                    label: 'Top '+quantity+' products',
                    data: info.products_dataset.slice(0, quantity),
                    backgroundColor: bg_color_list,
                    borderColor: bg_color_list,
                    borderWidth: 1,
                    pointBorderColor: 'white',
                    pointBackgroundColor: 'red',
                    pointRadius: 5,
                    pointHoverRadius: 10,
                    pointHitRadius: 30,
                    pointBorderWidth: 2,
                    pointStyle: 'rectRounded'
                },{
                    label: 'Top '+quantity+' quant products',
                    backgroundColor: bg_alpha_color_list,
                    data: info.products_quant_dataset.slice(0, quantity),
                }];
        }
        if(max_p >= max_q) maxx = max_p
        else maxx = max_q
        return new Chart(barChart, {
            type: 'bar',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: list
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0,
                            max: maxx,
                            stepSize: info.products_dataset.slice(0, quantity)
                            .reduce((pv,cv)=>{return pv + (parseFloat(cv)||0)},0)
                            /quantity
                          }
                    }]
                },
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 100, // ерөнхий animate хийх хугацаа
                },
                hover: {
                    animationDuration: 500, // hover хийхэд
                },
                responsiveAnimationDuration: 500, // хэмжээ өөрчлөгдөхөд
                legend: {
                    display: true,
                    labels: {
                        fontColor: 'black'
                    }
                },
            },
        });
    },
    drawPieChart: function (info) {
        var self = this
        //Pie Chart
        var pieChart = this.$el.find('#customChart');
        var bg_color_list = []
        for (var i=0;i<=quantity;i++){
            bg_color_list.push(self.getRandomColor())
        }
        var color = Chart.helpers.color
        var bg_alpha_color_list = []
        for (var i=0;i<=bg_color_list.length;i++){
            bg_alpha_color_list.push(color(bg_color_list[i]).alpha(0.95).rgbString())
        }
        var pieChart = new Chart(pieChart, {
            type: 'pie',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                    data: info.products_dataset.slice(0, quantity),
                    backgroundColor: bg_color_list,
                    label: 'Top '+quantity+' products',
                },{
                    label: 'Top '+quantity+' quant products',
                    backgroundColor: bg_alpha_color_list,
                    data: info.products_quant_dataset.slice(0, quantity),
                }],
            },
            options: {
                responsive: true
            }
        });
    },
    drawLineChart: function (info) {
        var self = this
        //Line Chart
        var lineChart = this.$el.find('#customChart');
        var color_index = self.getRandomColor()
        var color = Chart.helpers.color
        if(info_compare_type == 'medium'){
            var list = {
                    label: "Posibility",
                    type: "line",
                    borderColor: "#d90026",
                    data: info.products_posibility_dataset.slice(0, quantity),
                    fill: false
            };
        }else var list = [];
        var lineChart = new Chart(lineChart, {
            type: 'line',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                    label: 'Top '+quantity+' products',
                    backgroundColor: color(color_index).alpha(0.4).rgbString(),
                    fillColor: color_index,
                    strokeColor: color_index,
                    pointColor: color_index,
                    pointStrokeColor: color_index,
                    pointHighlightFill: color_index,
                    pointHighlightStroke: color_index,
                    data: info.products_dataset.slice(0, quantity),
                },{
                    label: 'Top '+quantity+' quant products',
                    backgroundColor: "#000099",
                    data: info.products_quant_dataset.slice(0, quantity),
                    backgroundColor: color('#0091cf').alpha(0.3).rgbString(),
                },list]
            },
            options: {
                responsive: true
            }    
        });
    },
    drawRadarChart: function(info) {
        var self = this
        //Radar Chart
        var radarChart = this.$el.find('#customChart');
        var color_index = self.getRandomColor()
        var color = Chart.helpers.color;
        var radarChart = new Chart(radarChart, {
            type: 'radar',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                    label: 'Products',
                    backgroundColor: color(color_index).alpha(0.4).rgbString(),
                    borderColor: color_index,
                    pointBackgroundColor: color_index,
                    data: info.products_dataset.slice(0, quantity),
                },{
                    label: 'Top '+quantity+' quant products',
                    backgroundColor: color(color_index).alpha(0.2).rgbString(),
                    borderColor: color_index,
                    pointBackgroundColor: color_index,
                    data: info.products_quant_dataset.slice(0, quantity),
                }]
            },
            options: {
                legend: {
                    position: 'top',
                },
                scale: {
                    ticks: {
                        beginAtZero: true
                    }
                }
            }   
        });
    },
    drawPolarChart: function(info) {
        var self = this
        //Polar Chart
        var polarChart = this.$el.find('#customChart');
        var bg_color_list = []
        for (var i=0;i<=quantity;i++){
            bg_color_list.push(self.getRandomColor())
        }
        var color = Chart.helpers.color
        var bg_alpha_color_list = []
        for (var i=0;i<=bg_color_list.length;i++){
            bg_alpha_color_list.push(color(bg_color_list[i]).alpha(0.5).rgbString())
        }
        var polarChart = new Chart(polarChart, {
            type: 'polarArea',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                        data: info.products_dataset.slice(0, quantity),
                        backgroundColor: bg_color_list,
                        hoverBackgroundColor: bg_color_list, // gereltuuleh
                    },{
                        label: 'Top '+quantity+' quant products',
                        backgroundColor: bg_alpha_color_list,
                        data: info.products_quant_dataset.slice(0, quantity),
                }]
            },
            options: {
                responsive: true
            }    
        });
    },
    drawDoughnutChart: function(info) {
        var self = this
        //Doughnut Chart
        var doughnutChart = this.$el.find('#customChart');
        var bg_color_list = []
        for (var i=0;i<=quantity;i++){
            bg_color_list.push(self.getRandomColor())
        }
        var color = Chart.helpers.color
        var bg_alpha_color_list = []
        for (var i=0;i<=bg_color_list.length;i++){
            bg_alpha_color_list.push(color(bg_color_list[i]).alpha(0.9).rgbString())
        }
        var doughnutChart = new Chart(doughnutChart, {
            type: 'doughnut',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                        data: info.products_dataset.slice(0, quantity),
                        backgroundColor: bg_color_list,
                        hoverBackgroundColor: bg_color_list // gereltuuleh
                    },{
                        label: 'Top '+quantity+' quant products',
                        backgroundColor: bg_alpha_color_list,
                        data: info.products_quant_dataset.slice(0, quantity),
                    }]
            },
            options: {
                responsive: true
            }    
        });
    },
    drawBubbleChart: function(info) {
        var self = this
        //Doughnut Chart
        var bubbleChart = this.$el.find('#customChart');
        var bg_color_list = []
        for (var i=0;i<=quantity;i++){
            bg_color_list.push(self.getRandomColor())
        }
        var max_p = Math.max.apply(null, info.products_dataset.slice(0, quantity));
        var max_q = Math.max.apply(null, info.products_quant_dataset.slice(0, quantity));
        var maxx;
        if(max_p >= max_q) maxx = max_p
        else maxx = max_q
        var bubbleChart = new Chart(bubbleChart,{
            type: 'bubble',
            data: {
                labels: info.products_label.slice(0, quantity),
                datasets: [{
                    label: 'Top '+quantity+' products',
                    data: info.products_dataset.slice(0, quantity),
                    backgroundColor: bg_color_list,
                    borderColor: bg_color_list,
                    borderWidth: 1,
                    pointBorderColor: 'white',
                    pointBackgroundColor: 'red',
                    pointRadius: 5,
                    pointHoverRadius: 10,
                    pointHitRadius: 30,
                    pointBorderWidth: 2,
                    pointStyle: 'rectRounded'
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0,
                            max: maxx,
                            stepSize: info.products_dataset.slice(0, quantity)
                            .reduce((pv,cv)=>{return pv + (parseFloat(cv)||0)},0)
                            /quantity
                          }
                    }],
                },
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 100, // ерөнхий animate хийх хугацаа
                },
                hover: {
                    animationDuration: 500, // hover хийхэд
                },
                responsiveAnimationDuration: 500, // хэмжээ өөрчлөгдөхөд
                legend: {
                    display: true,
                    labels: {
                        fontColor: 'black'
                    }
                },
            },
        });
    },
    graph: function() {
        var self = this
        var info;
        if (selected_rows != undefined){
            info = {'products': [],
                    'products_label': [],
                    'products_dataset': [],
                    'products_quant': [],
                    'products_quant_dataset': [],
                    'products_posibility_dataset': [],}
            var j = 0;
            // var len = self.products.length;
            for(var i = 0; i < selected_rows.length; i++){
                info.products[j] = self.product_info.products[selected_rows[i]-1];
                info.products_label[j] = self.product_info.products_label[selected_rows[i]-1];
                info.products_dataset[j] = self.product_info.products_dataset[selected_rows[i]-1];
                info.products_quant[j] = self.product_info.products_quant[selected_rows[i]-1];
                info.products_quant_dataset[j] = self.product_info.products_quant_dataset[selected_rows[i]-1];
                info.products_posibility_dataset[j] = self.product_info.products_posibility_dataset[selected_rows[i]-1];
                j ++;
            }
            
            quantity = info.products.length
        }else{
            info = self.product_info 
        }
        if (graph_type == 'bar') return self.drawBarChart(info)
        else if (graph_type == 'pie') return self.drawPieChart(info)
        else if (graph_type == 'line') return self.drawLineChart(info)
        else if (graph_type == 'radar') return self.drawRadarChart(info)
        else if (graph_type == 'polar') return self.drawPolarChart(info)
        else if (graph_type == 'doughnut') return self.drawDoughnutChart(info)
        else if (graph_type == 'bubble') return self.drawBubbleChart(info)
    },
    drawTable: function() {
        $('#product_details').DataTable( {
            dom: 'Bfrtip',
            buttons: [
                // 'copy', 
                'csv', 
                'excel',
                {
                    extend: 'pdf',
                    footer: 'true',
                    orientation: 'landscape',
                    title:'Employee Details',
                    text: 'PDF',
                    exportOptions: {
                        modifier: {
                            selected: true
                        }
                    }
                },
                {
                    extend: 'print',
                    exportOptions: {
                    columns: ':visible'
                    }
                },
            'colvis'
            ],
            columnDefs: [ {
                targets: -1,
                visible: false
            } ],
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            pageLength: 10,
        } );
        var selectedRows = $('.table').find('tbody') // select table body and
            .find( 'tr' )
            .eq(selected_rows)
            // .set('input[type=checkbox]:checked')
            // .rowIndex // select all rows that has
        console.log('Selection ',selectedRows)
        // selected_rows = []
        // for (var i = 0 ; i < selectedRows.length; i++){
        //     selected_rows.push(selectedRows[i].rowIndex)
        // }
        // $('#product_details tbody tr td').on( 'click', '#check_info', function () {
        //     if ( $(this).has('input[type=checkbox]:checked')) {
        //         var check = $(this).find('input[type=checkbox]:checked');
        //         console.log('--> ',$('#product_details tbody tr').closest(check));
        //     }
        //     else {
        //         console.log('baihgui')
        //         // table.$('tr.selected').removeClass('selected');
        //         // $(this).addClass('selected');
        //     }

        // } );
    },
    /* Event функцууд */
    // Хяналтын самбар дээр дарах үед
    on_dashboard_action_clicked: function(ev){
        ev.preventDefault();
        var $action = $(ev.currentTarget);
        var action_name = $action.attr('name');
        var action_extra = $action.data('extra');
        var additional_context = {};

        if (action_name === 'calendar.action_calendar_event') {
            additional_context.search_default_mymeetings = 1;
        }

        this.do_action(action_name, {additional_context: additional_context});
    },
    on_insert_button_action_clicked: function(ev){
        quantity = $('#input_quantity').val();
        this.render()
    },
    on_clicked_product_info: function(ev){
        var selectedRows = $('.table').find('tbody') // select table body and
            .find( 'tr' ) // select all rows that has
            .has( 'input[type=checkbox]:checked')
        selected_rows = []
        for (var i = 0 ; i < selectedRows.length; i++){
            selected_rows.push(selectedRows[i].rowIndex)
        }
    },
    on_clicked_datetime: function(ev){
        datestart = $('#datetimePickerStart').val();
        dateto = $('#datetimePickerTo').val();
        console.log('Info ',datestart,dateto)
        // if (datestart && dateto) this.render()
        // $(document).ready( function() {
        //     let now = new Date();
         
        //     let day = ("0" + now.getDate()).slice(-2);
        //     let month = ("0" + (now.getMonth() + 1)).slice(-2);

        //     let today = (day)+"-"+(month)+"-"+ now.getFullYear();


        //    $('#datePicker').val(today);
            
        //     $('#datebtn').click(function(){
                
        //         testClicked();
                
        //     });
        // });
        // function testClicked()
        // {
        //   $('.getDate').html($('#datePicker').val());
        // }

    },
});
// View adding to the registry
core.view_registry.add('stock_dashboard_kanban_view', StockDashboardKanbanView);
return StockDashboardKanbanView;
});