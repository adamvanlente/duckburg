// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.masterSearch = {

  /**
   * Start the search
   * @function kicks off the master search
   * @param event Object keyeup event from search bar.
   *
   */
   search: function(event) {

     // Get the term and close if the term is empty.
     var term = event.currentTarget.value;
     if (term == '') {
       $('.masterSearchBox').hide();
       return;
     }

     // Don't do anything if the term hasn't changed.
     if (duckburg.masterSearch.previousTerm &&
       duckburg.masterSearch.previousTerm == term) {
         return;
     }

     // Show the search box.
     $('.masterSearchBox').show();

     // Set loading messages
     duckburg.masterSearch.setLoadingMessages();

     // Clear any existing timers.
     if (duckburg.masterSearch.timer) {
       window.clearInterval(duckburg.masterSearch.timer);
     }

     // Set an offclick listener.
     setTimeout(function() {
       $(document).bind('click', duckburg.masterSearch.hide);
     }, 200);

     // Kick off the search.
     duckburg.masterSearch.timer = setTimeout(function() {

       // Refresh the term.
       term = event.currentTarget.value;

       // Customer search.
       duckburg.masterSearch.customerSearch(term, 'dbCustomer');

       // Customer search.
       duckburg.masterSearch.customerSearch(term, 'dbOrder');

       // Store the last search term.
       duckburg.masterSearch.previousTerm = term;

     }, 500);
   },

   /**
    * Set loading messages for the items.
    * @function notifies the user that search is in progress.
    *
    */
   setLoadingMessages: function() {

     $('.msOrderHolder')
       .html('')
       .append($('<label>')
         .attr('class', 'loadingLabel')
         .html('searching for orders'));

     $('.msCustomerHolder')
       .html('')
       .append($('<label>')
         .attr('class', 'loadingLabel')
         .html('searching for customers'));
   },

   /** Kill the master search actions. **/
   hide: function() {

     // Hide the search box.
     $('.masterSearchBox').hide();

     // Clear the term.
     $('.masterSearch').val('');

     // Kill listener.
     $(document).unbind('click', duckburg.masterSearch.hide);

     // Hide the last search term.
     duckburg.masterSearch.previousTerm = false;
   },

   /**
    * Search for customers and place the responses in the holder.
    * @function searches for customers matching the term.
    * @param term String term to use as search filter
    *
    */
   customerSearch: function(term, type) {

     var divClass;
     var verb;
     if (type == 'dbCustomer') {
       divClass = '.msCustomerHolder';
       verb = 'customers';
     } else if (type == 'dbOrder') {
       divClass = '.msOrderHolder';
       verb = 'orders';
     }

     duckburg.requests.findObjects(type, term, function(results) {

       if (results && results.length > 0) {

         // Clear the holder.
         $(divClass).html('');

         // Handle the results.
         for (var i = 0; i < results.length; i++) {

           // Set a customer result.
           if (type == 'dbCustomer') {
             var cust = results[i];
             var c = cust.attributes;
             var name = c.first_name + ' ' + c.last_name;

             $(divClass)
               .append($('<div>')
                 .attr('class', 'msSearchResult')
                 .append($('<label>')
                   .html(name))
                 .append($('<button>')
                   .html('edit')
                   .attr('id', cust.id)
                   .click(function(e) {
                     var id = e.currentTarget.id;
                     window.location.href = '/viewObject/dbCustomer/' + id;
                   }))
                 .append($('<button>')
                   .html('<i class="fa fa-external-link-square"></i>')
                   .attr('id', cust.id)
                   .click(function(e) {
                     var id = e.currentTarget.id;
                     window.open('/viewObject/dbCustomer/' + id, '_blank');
                   })));
           }

           // Set a customer result.
           if (type == 'dbOrder') {
             var order = results[i];
             var o = order.attributes;

             $(divClass)
                .append($('<div>')
                  .attr('class', 'msSearchResult')
                  .append($('<label>')
                    .html(o.order_name))
                  .append($('<button>')
                    .html('edit')
                    .attr('id', o.readable_id)
                    .click(function(e) {
                      var id = e.currentTarget.id;
                      window.location.href = '/order/' + id;
                    }))
                  .append($('<button>')
                    .html('<i class="fa fa-external-link-square"></i>')
                    .attr('id', o.readable_id)
                    .click(function(e) {
                      var id = e.currentTarget.id;
                      window.open('/order/' + id, '_blank');
                    })));
           }
         }
       } else {

           // Empty results message.
           $(divClass)
             .html('')
             .append($('<label>')
               .attr('class', 'noResultsLabel')
               .html('no ' + verb + ' match this search'));
       }
     });
   }
};
