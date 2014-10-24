// ******************************************
// Route handler for orders.
// __________________________________________

var Order      = require('../models/order');
var Activity   = require('../models/activity');

module.exports = function(app) {

    // Create an order.
    app.post('/orders/:action/:dueDate/:jobName/:status/:comments/:billc/:shipc/:subtotal/:balance/:jobId', function(req, res) {

        // http://localhost:3000/orders/create/12%2F21%2F2014/Adam%20Job/printing/some%20comments/001/001/225/25/NA

        // http://localhost:3000/orders/create/12%2F21%2F2014/Adam%20Job/printing/some%20comments/001/001/225/25/SOMEJOBID

        var action       = req.params.action;

        var dueDate      = req.params.dueDate;
        var jobName      = req.params.jobName;
        var status       = req.params.status;
        var comments     = req.params.comments;
        var billingCust  = req.params.billc;
        var shippingCust = req.params.shipc;
        var subtotal     = req.params.subtotal;
        var balance      = req.params.balance;
        var jobId        = req.params.jobId;

        var newOrder                = {};
        newOrder.created            = new Date();
        // Date must be MM/DD/YYYY string
        newOrder.due_date           = new Date(dueDate);
        newOrder.job_name           = jobName;
        newOrder.status             = status;
        newOrder.job_comments       = comments;
        newOrder.billing_customer   = billingCust;  // _id of cust
        newOrder.shipping_customer  = shippingCust; // _id of cust
        newOrder.subtotal           = subtotal;
        newOrder.balance            = balance;

        if (action == 'create') {

            Order.orderCount(function(count) {

                // Create an incremented ID, eg 000012.
                var shipId  = '000000' + String(count);
                var trim    = shipId.length - 6;
                shipId      = shipId.substr(trim, shipId.length);

                newOrder.shipment_id        = shipId;

                Order.createNew(newOrder, function(json) {

                    var activity                   = {};

                    activity.order_id              = shipId;
                    activity.customer              = billingCust;
                    activity.type                  = 'Order Created';
                    activity.additional_notes      = 'none';
                    activity.timestamp             = new Date();

                    Activity.createNew(activity, function(activity) {

                        var response     = {};
                        response.success = true;
                        response.result  = json;

                        res.json(response);

                    })
                });
            });

        } else if (action == 'update') {

            Order.updateOrder(jobId, newOrder, function(order) {

                var activity                   = {};

                activity.order_id              = order.shipment_id;
                activity.customer              = order.billing_customer;
                activity.type                  = 'Order Updated';
                activity.additional_notes      = 'none';
                activity.timestamp             = new Date();

                Activity.createNew(activity, function(activity) {

                    var response     = {};
                    response.success = true;
                    response.result  = order;

                    res.json(response);

                })
            });
        }

    });
};
