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

  /** Month dictionary **/
  monthDict: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'],

  /**
   * Loads the initial page view.
   * @function loads the initial view for the page.
   *
   */
  load: function() {

    // Load view options/header
    duckburg.printing.loadViewOptions();
  },

  loadViewOptions: function(option) {

    // Option is default if undefined.
    option = option || duckburg.printing.defaultView;

    // Clear header.
    $('.printCalHeader').html('');

    // Fill print header with options.
    var options = ['day', 'week', 'month'];

    for (var i = 0; i < options.length; i++) {

      // Get mode and set the class.
      var mode = options[i];
      var optionClass = mode == option ? 'selected' : 'unselected';

      $('.printCalHeader')
        .append($('<label>')
          .html(mode)
          .attr('class', optionClass)
          .attr('id', mode)
          .click(function(e) {
            var m = e.currentTarget.id;
            duckburg.printing.loadViewOptions(m);
          }));
    }

    // Now, load the printing calendar.
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

    // Capture current mode.
    duckburg.printing.currentView = mode;

    // Capture the orders.
    duckburg.printing.currentlyOpenOrders = {};

    // Initialize a print time object.
    duckburg.printing.printTimeObject = {};

    // Get the date.
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

    // Perform the queries and continue with the help of the callback functions.
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

    duckburg.printing.toggleByDays = 1;
    if (mode == 'week') {
      duckburg.printing.toggleByDays = 7;
    } else if (mode == 'month') {
      duckburg.printing.toggleByDays = 30;
    }

    if (mode == 'day') {
      var year = date.getFullYear();
      var prettyDate = String(date).split(String(year))[0];
      $('.currentViewingDate').html(prettyDate + year);
    } else if (mode == 'week') {
      var month = duckburg.printing.monthDict[date.getMonth()];
      var string = 'Week of ' + month + ' ' + date.getDate();
      $('.currentViewingDate').html(string);
    } else if (mode == 'month') {
      var month = duckburg.printing.monthDict[date.getMonth()];
      $('.currentViewingDate').html('Month of ' + month);
    }
  },

  /**
   * Render the order results.
   * @function that renders the orders according to the current mode.
   *
   */
  renderResults: function() {

    // Get the current mode.
    var mode = duckburg.printing.currentView;
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
   *
   */
  setDayOrders: function() {

    // Grab orders.
    var orders = duckburg.printing.currentResults;

    // Prepare a holder for highsmiths.
    var highsmiths = [];

    // No orders message
    if (orders.length == 0) {
      $('.printCal')
        .append($('<div>')
          .attr('class', 'noOrders')
          .html('no projects today'));
    } else {

      $('.printCal')
        .append($('<div>')
          .attr('class', 'totalPrintHours'));

    }

    // Do work with the orders.
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      var d = order.attributes;

      if (d.order_status == 'completed') {
        continue;
      }

      duckburg.printing.currentlyOpenOrders[order.id] = order;

      date = new Date(d.print_date);
      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);

      // Highsmith listeners.
      highsmiths.push('dPrintDate' + order.id);

      // Get background color.
      var bgColor = duckburg.utils.orderStatusMap[d.order_status];
      var completedBgColor = duckburg.utils.orderStatusMap['completed'];

      // Summary
      var summary = JSON.parse(d.order_summary);

      // Order time.
      var printTime = duckburg.utils.calculateOrderTime(summary.total_pieces);
      if (duckburg.printing.printTimeObject[id]) {
        duckburg.printing.printTimeObject[id] += parseFloat(printTime);
      } else {
        duckburg.printing.printTimeObject[id] = parseFloat(printTime);
      }

      // Designs
      var designDiv = $('<span>').attr('class', 'designHolder');

      var items = d.items || '{}';
      items = JSON.parse(items);
      var designIndex = 0;
      for (var item in items) {

        // Set design and name.
        designIndex++;
        var design = items[item];
        var designName = design.item_name || 'Design No.' + designIndex;

        // Get images
        var designImages = design.design_images_list;
        designImages = designImages.split(',');
        var imagesDiv = $('<label>').attr('class', 'imageHolder');
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

        // Get the sizes.
        var sizes = design.sizes || {};
        var sizeDiv = $('<label>').attr('class', 'sizeHolder');
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

        // Append a design div.
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
            .append(sizeDiv)
            .append(imagesDiv)
            );
      }

      $('.printCal')
        .append($('<div>')
          .attr('class', 'dayDiv')
          .append($('<span>')
            .attr('class', 'dayDivHeader')
            .append($('<input>')
              .attr('type', 'text')
              .attr('name', order.id)
              .attr('id', 'dPrintDate' + order.id)
              .val(duckburg.utils.formatDate(d.print_date))
              .click(function(e) {
                var id = $(e.currentTarget).attr('name');
                duckburg.printing.openPrintDateInput = id;
                $(document).bind('click', duckburg.printing.updatePrintDate);
              }))
            .append($('<label>')
              .html(d.order_name))
            .append($('<em>')
              .html(d.readable_id)))

          .append($('<span>')
            .attr('class', 'body')

            .append($('<span>')
              .attr('class', 'orderStatusSpan')
              .append($('<label>')
                .css({'background': bgColor})
                .html(d.order_status))
              .append($('<label>')
                .css({'background': completedBgColor})
                .html('mark as completed')
                .attr('class', 'completedLabel')
                .attr('id', order.id)
                .click(function(e) {
                  var orderId = e.currentTarget.id;
                  var clickedOrder =
                      duckburg.printing.currentlyOpenOrders[orderId];
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

            .append($('<span>')
              .attr('class', 'summary')
              .append($('<label>')
                .html(summary.total_pieces + ' total items'))
              .append($('<label>')
                .html(printTime + ' hrs'))
              )

          .append(designDiv)

        ));
    }

    // Insert total print time.
    var totalHours = duckburg.printing.printTimeObject[id].toFixed(2);
    $('.totalPrintHours').html(totalHours + ' total hours today')

    // Add highsmith listeners.
    duckburg.utils.addHighsmithCalendars(highsmiths);

  },

  /**
   * Set the screen for the week view.
   *
   */
  setWeekMode: function() {

    var date = new Date(duckburg.printing.currentDate);
    var index = 0;

    while (index < 7) {

      var day = date.getDate();
      var month = date.getMonth();
      var year = date.getFullYear();
      var id = String(day) + String(month) + String(year);
      var stringDate = String(date).split(year)[0];

      $('.printCal')
        .append($('<div>')
          .attr('id', id)
          .attr('class', 'dayWeekDiv')
          .append($('<h1>')
            .html(stringDate))
          .append($('<span>')
            .attr('class', 'dayWeekHours')
            .attr('id', 'dayWeekHours' + id)
            .html('0.00 hrs'))
          .append($('<span>')
            .attr('class', 'dayWeekHolder')
            .attr('id', 'dayWeekHolder_' + id)
            .append($('<label>')
              .html('No jobs today')
              .attr('id', 'noJobs' + id)
              .attr('class', 'noJobsToday'))));

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

    // Do work with the orders.
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      var d = order.attributes;

      duckburg.printing.currentlyOpenOrders[order.id] = order;

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

      // Order time.
      var printTime = duckburg.utils.calculateOrderTime(summary.total_pieces);
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
      $('#dayWeekHolder_' + id)
        .append($('<span>')
          .css({'background': bgColor})
          .attr('class', 'dayWeekOrderItem')
          .append($('<a>')
            .attr('href', '/order/' + d.readable_id)
            .html(d.order_name))
          .append($('<input>')
            .attr('type', 'text')
            .attr('class', 'dwPrintDate')
            .attr('id', 'dwPrintDate' + order.id)
            .attr('name', order.id)
            .val(duckburg.utils.formatDate(d.print_date))
            .click(function(e) {
              var id = $(e.currentTarget).attr('name');
              duckburg.printing.openPrintDateInput = id;
              $(document).bind('click', duckburg.printing.updatePrintDate);
            }))
          .append($('<span>')
            .attr('class', 'dwOrderStatus')
            .html(d.order_status))
          .append($('<span>')
            .attr('class', 'dwTotalPieces')
            .html(summary.total_pieces + ' total items'))
          .append($('<span>')
            .attr('class', 'dwPrintTime')
            .attr('id', 'dwPrintTime' + id)
            .html(printTime + ' hrs'))
          .append($('<span>')
            .attr('class', 'dwImages')
            .attr('id', 'dwImages' + id)
            .html(designString))
         );
    }

    // Add print time totals.
    for (var printTimeTotal in duckburg.printing.printTimeObject) {
      var total = duckburg.printing.printTimeObject[printTimeTotal];
      $('#dayWeekHours' + printTimeTotal).html(total.toFixed(2) + ' hrs');
    }

    // Add highsmith listeners.
    duckburg.utils.addHighsmithCalendars(highsmiths);
  },

  /**
   * Update the print date of a job.
   */
  updatePrintDate: function() {

    // If calendar is still visible, do nothing.  User is clicking through
    // months, years, etc.
    if ($('.highsmithCal').length > 0) {
      return false;
    }

    var id = duckburg.printing.openPrintDateInput;
    var order = duckburg.printing.currentlyOpenOrders[id];

    var date = $('[name="' + id + '"]').val();

    if (!date) {
      $(document).unbind('click', duckburg.printing.updatePrintDate);
      return;
    }

    date = new Date(date);
    order.set('print_date', date);
    order.save().then(function(response) {
      var mode = duckburg.printing.currentView;
      var date = duckburg.printing.currentDate;
      duckburg.printing.loadCalendar(mode, date);
      $(document).unbind('click', duckburg.printing.updatePrintDate);
    },

    function(error) {
      //
    });

  },

  /** Toggle the visible date down **/
  toggleDateDown: function() {

    var mode = duckburg.printing.currentView;
    var date = duckburg.printing.currentDate;
    var adjustBy = 0 - parseInt(duckburg.printing.toggleByDays);
    var newDate = duckburg.utils.addDaysToDate(date, adjustBy);
    duckburg.printing.loadCalendar(mode, newDate);
  },

  /** Toggle the visible date up **/
  toggleDateUp: function() {

    var mode = duckburg.printing.currentView;
    var date = duckburg.printing.currentDate;
    var newDate = duckburg.utils.addDaysToDate(
        date, duckburg.printing.toggleByDays);
    duckburg.printing.loadCalendar(mode, newDate);
  }
};
