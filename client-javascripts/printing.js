// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Printing page / Print calendar
 * @module allows product to get a look at the days/weeks/months workload.
 *
 */
duckburg.printing = {

  /** Default view **/
  defaultView: 'day', // will be week, month or day

  /**
   * Loads the initial page view.
   * @function loads the initial view for the page.
   *
   */
  load: function() {

    // Check if there is a default view in the cookie.
    if (duckburg.utils.cookieHasProp('defaultView')) {
      duckburg.printing.defaultView =
          duckburg.utils.getOneCookie('defaultView');
    }

    // Load view options/header
    duckburg.printing.loadViewOptions();
  },

  /**
   * Loads the options for views/modes.
   * @function that gives user the option of viewing jobs by day/week/month.
   * @param option String either day, week or month - the mode to view in.
   *
   */
  loadViewOptions: function(option) {

    // Option is default if undefined.
    option = option || duckburg.printing.defaultView;

    // Clear header.
    $('.printCalHeader').html('');

    // Fill print header with options.
    var options = ['day', 'week', 'month'];

    // Make a button for each view/mode.
    for (var i = 0; i < options.length; i++) {

      // Get mode and set the class.
      var mode = options[i];
      var optionClass = mode == option ? 'selected' : 'unselected';

      // Append a button for each mode.
      $('.printCalHeader')
        .append($('<label>')
          .html(mode)
          .attr('class', optionClass)
          .attr('id', mode)

          // Clicking on a mode switches to that mode.
          .click(function(e) {
            var m = e.currentTarget.id;
            duckburg.printing.loadViewOptions(m);
          }));
    }

    // Now, load the printing calendar in the selected mode.
    duckburg.printing.loadCalendar(option);
  },

  /**
   * Load the print calendar
   * @function takes a view mode and loads the calendar.
   * @param mode String day, week or month for calendar mode.
   * @param targetDate Object js date object to start from.
   *
   */
  loadCalendar: function(mode, targetDate) {

    // Set up the query params.
    var DbObject = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(DbObject);
    var allowedStatuses = ['open',
                           'approved',
                           'ordered',
                           'received',
                           'printing'];

    query.containedIn("order_status", allowedStatuses);

    // Capture current mode.
    duckburg.printing.currentView = mode;

    // Update the cookie to remember default mode.
    duckburg.utils.setCookie('defaultView', mode);

    // Capture the orders.
    duckburg.printing.currentlyOpenOrders = {};

    // Initialize a print time object.  This will allow for easy calculation of
    // total print hours for the given time period (day, month, week).
    duckburg.printing.printTimeObject = {};

    // Get the date.  This the the date to start searching from.  If day is the
    // view, we can use this day.  If week view is active, it will be reset to
    // the first day of the week, or first day of the month in month view.
    targetDate = targetDate || new Date();

    // Initialize vars for search ceiling & floor.
    var searchCeiling;
    var searchFloor;

    if (mode == 'week') {

      // Get Sunday of the week in question and reset target date to that.
      var days = 0 - targetDate.getDay();
      targetDate = duckburg.utils.addDaysToDate(targetDate, days);

      // Search by a date that is one week away from Sunday of this week, but
      // not older than this Sunday.
      searchCeiling = duckburg.utils.addDaysToDate(targetDate, 6);
      searchFloor = duckburg.utils.addDaysToDate(searchCeiling, -7);

      // Limit the query.
      query.lessThan('print_date', searchCeiling);
      query.greaterThan('print_date', searchFloor);
    } else if (mode == 'month') {

      // Set target date to first day of the month.
      targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

      // Set ceiling at a month away.
      searchCeiling = duckburg.utils.addDaysToDate(targetDate, 31);
      searchFloor = duckburg.utils.addDaysToDate(targetDate, -1);

      // Limit the query between first day of month and last.
      query.lessThan('print_date', searchCeiling);
      query.greaterThan('print_date', searchFloor);
    } else if (mode == 'day') {

      // Set floor and ceiling to include only current day in search.
      searchCeiling = duckburg.utils.addDaysToDate(targetDate, 0);
      searchFloor = duckburg.utils.addDaysToDate(targetDate, -1);

      // Query by date.
      query.lessThan('print_date', searchCeiling);
      query.greaterThan('print_date', searchFloor);
    }

    // Set the toggle bar.
    duckburg.printing.setToggleBar(mode, targetDate);

    // Clear the print calendar and set loading message.
    $('.printCal')
      .html('')
      .append($('<div>')
        .attr('class', 'loadingJobsMessage')
        .html('loading jobs'));

    // Perform a query that searches for Orders whose PRINT DATE matches the
    // above filters.  It will be a set of results matching a day's date, a
    // date within a calendar week, or a date within a calendar month.
    query.find({
      success: function(results) {

        // Render results.
        duckburg.printing.currentResults = results;
        duckburg.printing.renderResults();
      },
      error: function(result, error) {
        var errorMsg = 'Error gettting orders: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },


  /**
   * Render the order results.
   * @function that renders the orders according to the current mode.
   *
   */
  renderResults: function() {

    // Get the current mode.
    var mode = duckburg.printing.currentView;

    // Clear the calendar.
    $('.printCal').html('');

    // Set the view based on the mode.
    if (mode == 'week') {
      duckburg.printing.setWeekMode();
    } else if (mode == 'month') {
      duckburg.printing.setMonthMode();
    } else if (mode == 'day') {
      duckburg.printing.setDayOrders();
    }
  },

  /**
   * Set display for orders matching currently selected day.
   * @function that loads a view that lets the user view detailed information
   *           about each job for one single day.
   *
   */
  setDayOrders: function() {

    // Grab orders.
    var orders = duckburg.printing.currentResults;

    // Set display properties for the calendar.
    $('.printCal')
      .css({'text-align' : 'center',
            'width': '90%',
            'margin': '0 auto'});

    // Prepare a holder for highsmiths.
    var highsmiths = [];

    // No orders message
    if (orders.length == 0) {
      $('.printCal')
        .append($('<div>')
          .attr('class', 'noOrders')
          .html('no projects today'));
    } else {

      // If jobs exist, set a div holder for total print hours.
      $('.printCal')
        .append($('<div>')
          .attr('class', 'totalPrintHours'));
    }

    // Keep track of how many jobs there are (jobs may be skipped if their
    // status is completed, so this is different than orders.length).
    var dayJobCount = 0;

    // Render a div for each non-completed order.
    for (var i = 0; i < orders.length; i++) {

      // Get order and attributes.
      var order = orders[i];
      var d = order.attributes;

      // Bail out if the order is completed.
      if (d.order_status == 'completed') {
        continue;
      }

      // Increment our 'valid' job counter for this day.
      dayJobCount++;

      // Add each order to a global holder.
      duckburg.printing.currentlyOpenOrders[order.id] = order;

      // Create a unique id for today's date.
      date = new Date(d.print_date);
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);

      // Add the id of each calendar input that will be created.
      highsmiths.push('dPrintDate' + order.id);

      // Get background color for status/mark as completed labels.
      var bgColor = duckburg.utils.orderStatusMap[d.order_status];
      var completedBgColor = duckburg.utils.orderStatusMap['completed'];

      // Order summary object.
      var summary = JSON.parse(d.order_summary);

      // Calculate each job's print time as well as the day's total print time.
      var printTime = summary.total_hours || 0.00;
      if (duckburg.printing.printTimeObject[id]) {
        duckburg.printing.printTimeObject[id] += parseFloat(printTime);
      } else {
        duckburg.printing.printTimeObject[id] = parseFloat(printTime);
      }

      // Holder for designs.
      var designDiv = $('<span>').attr('class', 'designHolder');

      // Get the order items.
      var items = d.items || '{}';
      items = JSON.parse(items);
      var designIndex = 0;
      var deliveryMethodString = '';

      // Make a detailed div for each order item.
      for (var item in items) {

        // Count number of designs.
        designIndex++;

        // Set design and design name.
        var design = items[item];
        var designName = design.item_name || 'Design No.' + designIndex;

        // Div for names and numbers.
        var nnDiv = $('<label>').attr('class', 'nnHolder');

        if (design.delivery_method_visible == 'shipping') {
          deliveryMethodString =
              '<span><i class="fa fa-truck"></i> This item is shipping</span>';
        }

        if (design.delivery_method_visible == 'delivery') {
          deliveryMethodString =
              '<span><i class="fa fa-truck"></i>' +
              ' This item is being delivered</span>';
        }

        // Get names and numbers.
        if (design.names_and_numbers) {
          var nns = design.names_and_numbers || '[]';
          nns = JSON.parse(nns);
          for (var k = 0; k < nns.length; k++) {
            var nn = nns[k];

            var nnSpan = $('<span>');
            for (var param in nn) {
              nnSpan
                .append($('<label>')
                  .html(nn[param]));
            }

            // Append each name/number item to the main span.
            nnDiv.append(nnSpan);
          }
        }


        // Label for holding images.
        var imagesDiv = $('<label>').attr('class', 'imageHolder');

        // Get images and append each one to the design div.
        var designImages = design.design_images_list;
        designImages = designImages.split(',');
        for (var img = 0; img < designImages.length; img++) {
          var image = designImages[img];
          if (image.search('http://') == -1 &&
              image.search('jobimages') == -1 && image != '') {
            image = '/jobimages/' + image;
          }

          if (image != '') {
            // Append the image to the div.
            imagesDiv
              .append($('<img>')
                .attr('src', image));
          }
        }

        // Create a holder for sizes.
        var sizeDiv = $('<label>').attr('class', 'sizeHolder');

        // Append a span for each size/quantity combination.
        var sizes = design.sizes || {};
        for (var size in sizes) {
          var quantity = sizes[size];
          if (quantity && quantity != '' && quantity != 0) {
            sizeDiv
              .append($('<span>')
                .append($('<label>')
                  .html(size))
                .append($('<em>')
                  .html(quantity)))
          }
        }

        // Append a div for each design that contains its name, product type,
        // color, notes, sizes and images.
        var notes = design.product_description || '(no notes)';
        designDiv
          .append($('<span>')
            .attr('class', 'design')

            .append($('<label>')
              .attr('class', 'designName')
              .html(designName))
            .append($('<label>')
              .attr('class', 'designType')
              .html(design.product_type_visible))
            .append($('<label>')
              .attr('class', 'designColor')
              .html(design.product_colors))
            .append($('<label>')
              .attr('class', 'designDeliveryMethod')
              .html(deliveryMethodString))
            .append($('<label>')
              .attr('class', 'designDesc')
              .html('<h1>Notes</h1>' + notes))
            .append(sizeDiv)
            .append(nnDiv)
            .append(imagesDiv)
            );
      }

      // For each order, append a div that shows all of its details.
      $('.printCal')

        // Individual order div.
        .append($('<div>')
          .attr('class', 'dayDiv')
          .append($('<span>')

            // Order header.
            .attr('class', 'dayDivHeader')

            // Order print date within header.
            .append($('<input>')
              .attr('type', 'text')
              .attr('name', order.id)
              .attr('id', 'dPrintDate' + order.id)
              .val(duckburg.utils.formatDate(d.print_date))

              // Update the print date and reload on change of print date.
              .click(function(e) {
                var id = $(e.currentTarget).attr('name');
                duckburg.printing.openPrintDateInput = id;
                setTimeout(function() {
                  $(document).bind('click', duckburg.printing.updatePrintDate);
                }, 200);
              }))

            // Order name within header.
            .append($('<a>')
              .attr('href', '/order/' + d.readable_id)
              .html(d.order_name))

            // Readable id within header.
            .append($('<em>')
              .html(d.readable_id)))

          // Create a body span for the order that will contain all the order
          // details.
          .append($('<span>')
            .attr('class', 'body')

            // Create a span for the order status.
            .append($('<span>')
              .attr('class', 'orderStatusSpan')

              // Append a label for the current status.
              .append($('<label>')
                .css({'background': bgColor})
                .html(d.order_status))

              // Append a label/button that allows the user to easily mark
              // the order as completed.
              .append($('<label>')
                .css({'background': completedBgColor})
                .html('mark as completed')
                .attr('class', 'completedLabel')
                .attr('id', order.id)

                // Mark order as completed on click, and reload the view.
                .click(function(e) {

                  // Get id and the order it represents.
                  var orderId = e.currentTarget.id;
                  var clickedOrder =
                      duckburg.printing.currentlyOpenOrders[orderId];

                  // Set this order as completed and, when server responds,
                  // reload the view so that the order disappears.
                  clickedOrder.set('order_status', 'completed');
                  clickedOrder.save().then(function(response) {
                    var mode = duckburg.printing.currentView;
                    var date = duckburg.printing.currentDate;
                    duckburg.printing.loadCalendar(mode, date);
                  },

                  function(error) {
                    //
                  });
                })))

            // Append a label that shows how many pieces are in the order, and
            // how long it may take to print.
            .append($('<span>')
              .attr('class', 'summary')
              .append($('<label>')
                .html(summary.total_pieces + ' total items'))
              .append($('<label>')
                .html(printTime + ' hrs'))
              )

          // Append the div that contains information about all the order's
          // designs (assembled above).
          .append(designDiv)

        ));
    }

    // If there are no non-completed projects today, let the user know.
    if (dayJobCount == 0) {
      $('.printCal')
        .html('')
        .append($('<div>')
          .attr('class', 'noOrders')
          .html('no projects today'));
    } else {

      // Insert total print time.
      var totalHours = duckburg.printing.printTimeObject[id].toFixed(2);
      if (totalHours > 8) {
        $('.totalPrintHours')
          .html(totalHours + ' total hours today')
          .css({'background': 'red', 'color': 'white'});
      } else {
        $('.totalPrintHours')
          .html(totalHours + ' total hours today');
      }


      // Add highsmith listeners to all the calendars..
      duckburg.utils.addHighsmithCalendars(highsmiths);
    }
  },

  /**
   * Set the screen for the week view.
   * @function that loads an empty view for a calendar week.  This function is
   *           here to build the empty calendar, which in turn makes it simple
   *           to drop orders in on their respective day.
   *
   */
  setWeekMode: function() {

    // Get current date, which will be a Sunday starting a week.
    var date = new Date(duckburg.printing.currentDate);
    var index = 0;

    // Set display properties of the calendar.
    $('.printCal')
      .css({'text-align' : 'center',
            'width': '90%',
            'margin': '0 auto'});

    // For each day in the week, create a calendar-day item.
    while (index < 7) {

      // Format today's date and make a unique id.
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);
      var stringDate = String(date).split(year)[0];

      // Append blank calendar day item.
      duckburg.printing.addBlankCalendarDay(id, stringDate, 'dayWeek');

      // Incremement the date.
      date.setDate(date.getDate() + 1);
      index++;
    }

    // Render the orders for week view.
    duckburg.printing.setWeekOrders();
  },

  /**
   * Place orders into the week view.
   * @function week view is rendered, now we can place orders in the view.
   *
   */
  setWeekOrders: function() {

    // Grab orders.
    var orders = duckburg.printing.currentResults;

    // Prepare a holder for highsmiths.
    var highsmiths = [];

    // For each order, place a visible order descrption into the day in which
    // it is to be printed.
    for (var i = 0; i < orders.length; i++) {

      // Get order and details.
      var order = orders[i];
      var d = order.attributes;

      // Remember all of the open orders by id.
      duckburg.printing.currentlyOpenOrders[order.id] = order;

      // Get the day's date and format a unique id for the day.
      date = new Date(d.print_date);
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);

      // Each day starts with a note that says there are no jobs.  If there are
      // jobs for this day, remove that note.
      $('#noJobs' + id).remove();

      // Append the id of any calendar inputs so we can create
      // calendar listeners.
      highsmiths.push('dwPrintDate' + order.id);

      // Get background color.
      var bgColor = duckburg.utils.orderStatusMap[d.order_status];

      // Order summary object.
      var summary = JSON.parse(d.order_summary);

      // Get the amount of time for this print job, and build on an object that
      // will remember how much print time is required for each day.
      var printTime = summary.total_hours || 0.00;
      if (duckburg.printing.printTimeObject[id]) {
        duckburg.printing.printTimeObject[id] += parseFloat(printTime);
      } else {
        duckburg.printing.printTimeObject[id] = parseFloat(printTime);
      }

      // Build a string containing links to all of the images for this order.
      var items = d.items || '{}';
      items = JSON.parse(items);
      var designString = '';
      for (var item in items) {
        var design = items[item];
        if (design.design_images_list) {
          var img = design.design_images_list;
          designString += '<label onclick="duckburg.utils' +
              '.revealImageViewerWithImage(\'' + img + '\')">' +
              '<i class="fa fa-picture-o"></i></label>';
        }
      }

      // Fill the day with an order.
      $('#dayWeekHolder_' + id)

        // Append a div for this job to the correct date.
        .append($('<span>')
          .css({'background': bgColor})
          .attr('class', 'dayWeekOrderItem')

          // Header link with job name as content.
          .append($('<a>')
            .attr('href', '/order/' + d.readable_id)
            .html(d.order_name))

          // Input for print date.
          .append($('<input>')
            .attr('type', 'text')
            .attr('class', 'dwPrintDate')
            .attr('id', 'dwPrintDate' + order.id)
            .attr('name', order.id)
            .val(duckburg.utils.formatDate(d.print_date))

            // Update print date and refresh view on change of print date.
            .click(function(e) {
              var id = $(e.currentTarget).attr('name');
              duckburg.printing.openPrintDateInput = id;
              $(document).bind('click', duckburg.printing.updatePrintDate);
            }))

          // Span for order status.
          .append($('<span>')
            .attr('class', 'dwOrderStatus')
            .html(d.order_status))

          // Span showing total items on the job.
          .append($('<span>')
            .attr('class', 'dwTotalPieces')
            .html(summary.total_pieces + ' total items'))

          // Span showing the job's total print time.
          .append($('<span>')
            .attr('class', 'dwPrintTime')
            .attr('id', 'dwPrintTime' + id)
            .html(printTime + ' hrs'))

          // String that contains links to view each image.
          .append($('<span>')
            .attr('class', 'dwImages')
            .attr('id', 'dwImages' + id)
            .html(designString))
         );
    }

    // For each day in the week, display the total number of print hours.
    for (var printTimeTotal in duckburg.printing.printTimeObject) {
      var total = duckburg.printing.printTimeObject[printTimeTotal];
      if (total > 8) {
        $('#dayWeekHours' + printTimeTotal)
          .html(total.toFixed(2) + ' hrs')
          .css({'background': 'red'});
      } else {
        $('#dayWeekHours' + printTimeTotal)
          .html(total.toFixed(2) + ' hrs');
      }

    }

    // Add highsmith listeners so print dates can be updated.
    duckburg.utils.addHighsmithCalendars(highsmiths);
  },

  /**
   * Set the screen for the Month view.
   * @function that creates an empty calendar that will hold all of the job
   *           information throughout the course of a month.
   *
   */
  setMonthMode: function() {

    // Get the date, which will be the first day of a month.
    var date = new Date(duckburg.printing.currentDate);
    var index = 0;

    // Determine what number the first day of the month is, eg is it a Sunday(0)
    // or a Thursday (4)?
    var nextMonth = date.getMonth() + 1;
    var lastDay = new Date(date.getFullYear(), nextMonth, 0);
    var numberOfDaysInMonth = lastDay.getDate();

    // Create blank spacers leading up the first day of the month, eg if the
    // first day of the month is a Monday, create one blank spacer representing
    // Sunday to give the familiar calendar layout.
    var daysToStagger = date.getDay();
    for (var i = 0; i < daysToStagger; i++) {
      $('.printCal')
        .append($('<div>')
          .attr('class', 'dayMonthSpacer'))
    }

    // Update the calendar display properties.
    $('.printCal')
      .css({'text-align' : 'left',
            'width': '900px',
            'margin': '0 auto'});

    // Create a calendar-day item for each day in the month.
    while (index < numberOfDaysInMonth) {

      // Get the day's date and give it a unique id.
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);
      var stringDate = String(date).split(year)[0];

      // Append blank calendar day item.
      duckburg.printing.addBlankCalendarDay(id, stringDate, 'dayMonth');

      // Incremement the date.
      date.setDate(date.getDate() + 1);
      index++;
    }

    // Render the orders for week view.
    duckburg.printing.setMonthOrders();
  },

  /**
   * Add a blank holder representing a day to a calendar.
   * @function that, for week and month views, helps build a calendar by adding
   *           a blank holder for an individual day.
   * @param id String unique id representing the day.
   * @param stringDate String a string representation of the date.
   * @param classBase String base class name for the item (represents mode).
   *
   */
  addBlankCalendarDay: function(id, stringDate, classBase) {

    $('.printCal')

      // Append the calendar-day div.
      .append($('<div>')
        .attr('id', id)
        .attr('class', classBase + 'Div')

        // Header containing day's date.
        .append($('<h1>')
          .html(stringDate))

        // Span that will hold this day's total print hours.
        .append($('<span>')
          .attr('class', classBase + 'Hours')
          .attr('id', classBase + 'Hours' + id)
          .html('0.00 hrs'))

        // Start with a blank message informing the user that there are no jobs
        // for this date.  This message will be cleared if any jobs are found
        // for this date.  Easy way for us to have 'no jobs' message on empty
        // calendar days.
        .append($('<span>')
          .attr('class', classBase + 'Holder')
          .attr('id', classBase + 'Holder_' + id)
          .append($('<label>')
            .html('No jobs today')
            .attr('id', 'noJobs' + id)
            .attr('class', 'noJobsToday'))));
  },

  /**
   * Place orders into the Month view.
   * @function Month view is rendered, now we can place orders in the view.
   *
   */
  setMonthOrders: function() {

    // Grab orders.
    var orders = duckburg.printing.currentResults;

    // Prepare a holder for highsmiths.
    var highsmiths = [];

    // Do work with the orders.
    for (var i = 0; i < orders.length; i++) {

      // Get order and attributes.
      var order = orders[i];
      var d = order.attributes;

      // Keep track of all orders.
      duckburg.printing.currentlyOpenOrders[order.id] = order;

      // Set a unique id representing the day's date.
      date = new Date(d.print_date);
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);

      // Remove any no jobs notes.
      $('#noJobs' + id).remove();

      // Highsmith listeners.
      highsmiths.push('dwPrintDate' + order.id);

      // Get background color.
      var bgColor = duckburg.utils.orderStatusMap[d.order_status];

      // Summary
      var summary = JSON.parse(d.order_summary);

      // Get print time for each job as well as each day.
      var printTime = summary.total_hours || 0.00;
      if (duckburg.printing.printTimeObject[id]) {
        duckburg.printing.printTimeObject[id] += parseFloat(printTime);
      } else {
        duckburg.printing.printTimeObject[id] = parseFloat(printTime);
      }

      // Designs
      var items = d.items || '{}';
      items = JSON.parse(items);
      var designString = '';
      for (var item in items) {
        var design = items[item];
        if (design.design_images_list) {
          var img = design.design_images_list;
          designString += '<label onclick="duckburg.utils' +
              '.revealImageViewerWithImage(\'' + img + '\')">' +
              '<i class="fa fa-picture-o"></i></label>';
        }
      }

      // Fill the day with an order.
      $('#dayMonthHolder_' + id)

        // Span containing the order info, with a bgColor representing status.
        .append($('<span>')
          .css({'background': bgColor})
          .attr('class', 'dayWeekOrderItem')

          // Order name that links to order.
          .append($('<a>')
            .attr('href', '/order/' + d.readable_id)
            .html(d.order_name))

          // Due date.
          .append($('<input>')
            .attr('type', 'text')
            .attr('class', 'dwPrintDate')
            .attr('id', 'dwPrintDate' + order.id)
            .attr('name', order.id)
            .val(duckburg.utils.formatDate(d.print_date))

            // Allow user to easily update due date by changing w/ input.
            .click(function(e) {
              var id = $(e.currentTarget).attr('name');
              duckburg.printing.openPrintDateInput = id;
              $(document).bind('click', duckburg.printing.updatePrintDate);
            }))

          // Print time for order.
          .append($('<span>')
            .attr('class', 'dwPrintTime')
            .attr('id', 'dwPrintTime' + id)
            .html(printTime + ' hrs'))

          // Order status.
          .append($('<span>')
            .attr('class', 'dwOrderStatus')
            .html(d.order_status))

          // Total pieces in order.
          .append($('<span>')
            .attr('class', 'dwTotalPieces')
            .html(summary.total_pieces + '  pcs'))
         );
    }

    // Add print time totals.
    for (var printTimeTotal in duckburg.printing.printTimeObject) {
      var total = duckburg.printing.printTimeObject[printTimeTotal];
      if (total > 8) {
        $('#dayMonthHours' + printTimeTotal)
          .html(total.toFixed(2) + ' hrs')
          .css({'background': 'red'});
      } else {
        $('#dayMonthHours' + printTimeTotal)
          .html(total.toFixed(2) + ' hrs');
      }
    }

    // Add highsmith listeners.
    duckburg.utils.addHighsmithCalendars(highsmiths);
  },

  /**
   * Update the print date of a job.
   * @function that listens for a print date to be updated.  When if find that
   *           one has changed, it updates the property of the order with
   *           parse, then refreshes the calendar when the server responds.
   */
  updatePrintDate: function() {

    // If calendar is still visible, do nothing.  User is clicking through
    // months, years, etc.
    if ($('.highsmithCal').length > 0) {
      return false;
    }

    // Get the order id and order.
    var id = duckburg.printing.openPrintDateInput;
    var order = duckburg.printing.currentlyOpenOrders[id];

    // Get the new print date value.
    var date = $('[name="' + id + '"]').val();

    // If there is no date to reset to, abort this function.
    if (!date) {
      $(document).unbind('click', duckburg.printing.updatePrintDate);
      return;
    }

    // Set the new date then refresh the object.
    date = new Date(date);
    order.set('print_date', date);
    order.save().then(function(response) {

      // When server responds, update the current calendar view.
      var mode = duckburg.printing.currentView;
      var date = duckburg.printing.currentDate;
      duckburg.printing.loadCalendar(mode, date);
      $(document).unbind('click', duckburg.printing.updatePrintDate);
    },

    function(error) {
      //
    });

  },

  /**
   * Set the toggle bar
   * @function allows user to toggle dates back and forth by day, week or month.
   * @param mode String mode to toggle by.
   * @param date Object target date to start with.
   *
   */
  setToggleBar: function(mode, date) {

    // Get and capture current date.
    date = new Date(date);
    duckburg.printing.currentDate = date;

    // Determine how many days to toggle by, based on the current view.
    duckburg.printing.toggleByDays = 1;
    if (mode == 'week') {
      duckburg.printing.toggleByDays = 7;
    } else if (mode == 'month') {
      duckburg.printing.toggleByDays = 31;
    }

    // Display the current day/week/month.
    if (mode == 'day') {
      var year = date.getFullYear();
      var prettyDate = String(date).split(String(year))[0];
      $('.currentViewingDate').html(prettyDate + year);
    } else if (mode == 'week') {
      var month = duckburg.utils.monthAbbrvDict[date.getMonth()];
      var string = 'Week of ' + month + ' ' + date.getDate();
      $('.currentViewingDate').html(string);
    } else if (mode == 'month') {
      var month = duckburg.utils.monthAbbrvDict[date.getMonth()];
      var year = String(date.getFullYear()).slice(2);
      $('.currentViewingDate').html('Month of ' + month + ' \'' + year);
    }
  },

  /** Toggle the visible date down **/
  toggleDateDown: function() {

    // Get mode and date.
    var mode = duckburg.printing.currentView;
    var date = duckburg.printing.currentDate;

    // We want to find the previous date here.  In day mode, its yesterday.  In
    // week mode, it is exactly 7 days ago.  In month mode, however, we just
    // want to find any date in the previous month (another function will round
    // it down to the first day of that month).  So, we will subtract from the
    // first date of the currenty month 26 days.  That way we know we'll
    // definitely be in the previous month, but we also know we won't have gone
    // too far (subracting 30 from March would put us back to January).
    var toggle;
    if (mode == 'month') {
      toggle = duckburg.printing.toggleByDays - 5;
    } else {
      toggle = duckburg.printing.toggleByDays;
    }

    // Adjust the current date.
    var adjustBy = 0 - parseInt(toggle);
    var newDate = duckburg.utils.addDaysToDate(date, adjustBy);
    duckburg.printing.loadCalendar(mode, newDate);
  },

  /** Toggle the visible date up **/
  toggleDateUp: function() {

    // Get date and mode.
    var mode = duckburg.printing.currentView;
    var date = duckburg.printing.currentDate;

    // Increment date.
    var newDate = duckburg.utils.addDaysToDate(
        date, duckburg.printing.toggleByDays);

    // Load calendar.
    duckburg.printing.loadCalendar(mode, newDate);
  }
};
