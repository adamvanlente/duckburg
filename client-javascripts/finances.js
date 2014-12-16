// Global duckburg namespace.
var duckburg = duckburg || {};

/**
* @module creates the finances page.
*
*/
duckburg.finances = {

  /** Default finance mode **/
  defaultView: 'payroll', // ledger, taxes or payroll

  /** Remember if all ledger items are checked. **/
  ledgerItemsAreLoaded: {},

  /** Remember all the ledger items. **/
  ledgerItemMemory: {},

  /**
   * Load the finances page.
   * @function that loads the main view for finances.
   * @param mode String mode to start in
   *
   */
  load: function(mode) {

    // Get mode.
    mode = mode || duckburg.finances.defaultView;

    // Set current mode.
    duckburg.finances.currentMode = mode;

    // Set menu.
    duckburg.finances.setMenu(mode);

    // Load the selected mode functions.
    if (mode == 'ledger') {
      duckburg.finances.loadLedger();
    } else if (mode == 'payroll') {
      duckburg.finances.loadPayroll();
    } else if (mode == 'taxes') {
      duckburg.finances.loadTaxes();
    }
  },

  /**
   * Set ledger menu
   * @function that sets the menu to the current selected mode.
   * @param mode String current view/mode.
   *
   */
  setMenu: function(mode) {
    $('.financeMenu').children().each(function() {
      if (this.innerHTML == mode) {
        this.className = 'ledgerItem active';
      } else {
        this.className = 'ledgerItem inactive';
      }
    })
  },

  /**
   * Loads the ledger view.
   * @function that loads the ledger view.
   *
   */
  loadLedger: function() {

    // Clear the main finances div.
    $('.finances').html('');

    // Add divs for different ledger aspects.
    $('.finances')

      // Buttons for adding basic expenses/income and doing payroll.
      .append($('<div>')
        .attr('class', 'ledgerMainButtons'))

      // Bank balance div.
      .append($('<div>')
        .attr('class', 'ledgerBankBalance')
        .append($('<label>')
          .html('Bank balance:'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'bankBalanceDiv')
          .attr('placeholder', 'bank balance')
          .keyup(function(e) {
            var balance = e.currentTarget.value;
            balance = balance.replace('$', '');
            duckburg.utils.setCookie('balance', balance);

            if (duckburg.finances.updateBalanceTimeout) {
              window.clearInterval(duckburg.finances.updateBalanceTimeout);
            }
            duckburg.finances.updateBalanceTimeout = setTimeout(function() {
              duckburg.finances.ledger.balance();
            }, 2500);
          }))
      )

      // Area that summarizes Balance, income, expenses and future funds
      .append($('<div>')
        .attr('class', 'ledgerSummaryArea')
        .append($('<label>')
          .html('Available funds:'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'availableBalanceDiv')
          .attr('placeholder', 'loading...')
          .attr('readonly', true)))

      // Area that summarizes Balance, income, expenses and future funds
      .append($('<div>')
        .attr('class', 'ledgerChecksCash')
        .append($('<label>')
          .html('With checks and cash:'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'checksAndCashInput')
          .attr('placeholder', 'loading...')
          .attr('readonly', true)))
      .append($('<div>')
        .attr('class', 'availableFundsProjections'))

      // All expenses
      .append($('<div>')
        .attr('class', 'ledgerExpenses')
        .append($('<h1>')
          .html('Expenses'))
        .append($('<div>')
          .attr('class', 'ledgerExpensesHolder'))
      )

      // All income
      .append($('<div>')
        .attr('class', 'ledgerIncome')
        .append($('<h1>')
          .html('Incoming'))
        .append($('<div>')
          .attr('class', 'ledgerIncomeHolder'))
      )

      // All payments
      .append($('<div>')
        .attr('class', 'ledgerPayments'));

      // Load ledger content.
      duckburg.finances.loadLedgerContent();
  },

  /**
   * Load the ledger content.
   * @function that fills ledger with content.
   *
   */
  loadLedgerContent: function() {

    // Load buttons to the ledger.
    duckburg.finances.ledger.buttons();

    // Load the balance
    duckburg.finances.ledger.balance();

    // Load expenses.
    duckburg.finances.ledger.expenses();

    // Load expenses.
    duckburg.finances.ledger.incoming();

    // Load available balance.
    duckburg.finances.ledger.available();
  },

  /**
   * Add a dialog for the finance view.
   * @function that launches a dialog for adding income, expense, etc.
   * @param type String type of dialog to launch.
   *
   */
  addDialog: function(type) {

    // Show popup.
    duckburg.utils.showPopup();
    $('#popupContent').attr('class', 'financeAddDialog')

    // Get today's date.
    var today = duckburg.utils.formatDate(new Date());

    // Load the form.
    $('#popupContent')
      .append($('<div>')
        .attr('class', 'financeForm')
        .attr('id', type));


    $('.financeForm')
      .append($('<input>')
        .attr('id', 'name')
        .attr('type', 'text')
        .attr('placeholder', type + ' name'));

    $('.financeForm')
      .append($('<input>')
        .attr('id', 'amount')
        .attr('type', 'text')
        .attr('placeholder', type + ' amount'));

    // Add a method for income.
    if (type == 'income') {
      $('.financeForm')
        .append($('<input>')
          .attr('id', 'method')
          .attr('type', 'text')
          .attr('placeholder', 'method'));
    }

    $('.financeForm')
      .append($('<input>')
        .attr('type', 'text')
        .attr('id', 'ledger_item_date')
        .val(today));

      // Append a button for form submission.
    $('#popupContent')
      .append($('<label>')
        .attr('class', 'financeItemFormSubmit')
        .html('submit')
        .click(function(e) {
          var prev = $(e.currentTarget).prev();
          duckburg.finances.addLedgerItem(prev);
        }))
      .append($('<label>')
        .attr('class', 'financeItemFormCancel')
        .html('cancel')
        .click(function() {
          duckburg.utils.hidePopup();
        }));

    // Add highsmith to the calendar.
    duckburg.utils.addHighsmithCalendars(['ledger_item_date'], true);
  },

  /**
   * Add a ledger income/expnse.
   * @function creates a database record for an income/expense item.
   *
   */
  addLedgerItem: function(form) {

    // Get type.
    var type = form.attr('id');

    // Get params
    var params = form.children();

    // Set an object for the item.
    var obj = {
      type: type,
      visible: true
    }

    // Assign the amount, etc.
    for (var i = 0; i < params.length; i++) {
      var input = params[i];
      if (input.id == 'ledger_item_date') {
        var date = new Date(input.value);
        obj[input.id] = date;
      } else {
        obj[input.id] = input.value;
      }
    }

    // Validate.
    if (obj.name == '' && obj.amount == '') {
      var err = 'Both Amount and Name are required.';
      duckburg.utils.errorMessage(err);
      return;
    }

    // Create the item.
    duckburg.requests.createNewObject('dbLedgerItem', obj, function(result) {

      var msg = 'Ledger item created.';
      duckburg.utils.successMessage(msg);
      duckburg.utils.hidePopup();

      if (duckburg.finances.currentMode == 'ledger') {

        // Load expenses.
        duckburg.finances.ledger.expenses();
        duckburg.finances.ledger.incoming();
      } else if (duckburg.finances.currentMode == 'taxes') {
        duckburg.finances.loadTaxes();
      }
    });
  },

  /**
   * Destroy a ledger item.
   * @function that destroys a ledger item
   * @param event Object click event from delete button.
   *
   */
  destroyLedgerItem: function(event) {
    var id = $(event.currentTarget).parent().attr('id');
    duckburg.requests.findById(id, 'dbLedgerItem',
      function(result) {
        result.set('visible', false);
        result.save().then(function(response) {
          $(event.currentTarget).parent().remove();
          duckburg.finances.ledger.expenses();
          duckburg.finances.ledger.incoming();
        },

        function(error) {
          //
        });
      }
    );
  },

  doPayroll: function() {

    // Check if payroll for this period has already been done, and abort if so.
    var lastSunday = new Date();
    lastSunday.setDate(lastSunday.getDate() - (lastSunday.getDay() + 7));
    lastSunday = String(lastSunday).split(lastSunday.getFullYear())[0] +
        String(lastSunday.getFullYear());

    // if (duckburg.finances.payrollObject[lastSunday]) {
    //   var msg = 'You have already done payroll for the current pay period.';
    //   duckburg.utils.errorMessage(msg);
    //   return;
    // }

    // Show the popup.
    duckburg.utils.showPopup();

    // Load the form.
    $('#popupContent')
      .attr('class', 'financeAddDialog')
      .append($('<div>')
        .attr('class', 'payrollForm'))
      .append($('<button>')
        .attr('class', 'submitPayroll')
        .html('submit payroll')
        .click(function() {
          duckburg.finances.calculatePayroll();
        }))
      .append($('<button>')
        .attr('class', 'cancelPayroll')
        .html('cancel')
        .click(function() {
          duckburg.utils.hidePopup();
        }));

    var userQuery = new Parse.Query(Parse.User);
    userQuery.notEqualTo('role', 'customer');
    userQuery.find({
      success: function(users) {
        for (var i = 0; i < users.length; i++) {
          var user = users[i];
          var u = user.attributes;

          $('.payrollForm')
            .append($('<span>')
              .attr('class', 'payrollFormItem')
              .attr('id', u.username)
              .attr('name', user.id)
              .append($('<h1>')
                .html(u.username))
              .append($('<label>')
                .html('hourly rate'))
              .append($('<input>')
                .attr('type', 'text')
                .attr('id', 'pay_rate')
                .val('$' + parseFloat(u.pay_rate).toFixed(2)))

              .append($('<label>')
                .html('hours this week'))
              .append($('<input>')
                .attr('type', 'text')
                .attr('id', 'week_hours')
                .attr('name', 'week_hours_' + user.id)
                .attr('placeholder', 'hours'))

              .append($('<label>')
                .html('salary/bonus'))
              .append($('<input>')
                .attr('type', 'text')
                .attr('id', 'week_salary')
                .attr('placeholder', 'salary/bonus'))
            );
        }

        // Get work sessions to help calc hours.
        // Do so inside success callback.
        duckburg.finances.getWorkSessions();
      }
    });
  },

  /**
   * Get total hours for users.
   * @function that gets total hours for the employees for a pay period.
   *
   */
  getWorkSessions: function() {

    var lastSunday = new Date();
    lastSunday.setDate(lastSunday.getDate() - (lastSunday.getDay() + 7));
    var endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() - (endOfWeek.getDay() + 1));

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbWorkSession');
    var query = new Parse.Query(DbObject);

    // Query filters.
    query.lessThan('createdAt', endOfWeek);
    query.greaterThan('createdAt', lastSunday);

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {

        var workSessions = {};
        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          var id = result.attributes.employee_id;
          var ws = result.attributes.minutes;
          if (workSessions[id]) {
            workSessions[id] += parseFloat(ws);
          } else {
            workSessions[id] = parseFloat(ws);
          }
        }
        duckburg.finances.showWorkedHours(workSessions);
      },
      error: function(error) {
        var errorMsg = 'Error gettting ledger items: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Show how many hours an employee worked in this pay period.
   * @function that shows how much an employee worked (to help with payroll).
   * @param employees Object containing employee ids and hours worked.
   *
   */
  showWorkedHours: function(employees) {

    // Iterate over the object, which contains key value pairs of items
    // employee_id: hours worked
    for (var emp in employees) {

      // Take the minutes and turn them into a fraction of an hour.
      var totalHours = duckburg.utils.minsToPayrollHours(employees[emp]);

      // Populate the employee's input.
      $('[name="week_hours_' + emp + '"]').val(totalHours);
    }
  },

  /**
   * Run over a payroll form, collect payroll info and create the ledger items.
   * @function that creates expenses for payroll items.
   *
   */
  calculatePayroll: function() {

    // Go over all payroll form items.
    $('.payrollFormItem').each(function() {
      var div = $(this);
      var name = div.attr('id');
      var userId = div.attr('name');

      // Get the params for the user.
      var params = div.children();
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        var payRate;
        var hours;
        var salary;
        if (param.id == 'pay_rate') {
          payRate = param.value.replace('$', '');
        }
        if (param.id == 'week_hours') {
          hours = param.value;
        }
        if (param.id == 'week_salary') {
          salary = param.value;
        }
      }

      // Only one error condition: there are hours but no pay rate.
      if (hours && !payRate) {
        var err = 'Employee ' + name + ' has hours but no pay rate.';
        duckburg.utils.errorMessage(err);
      } else {

        var regularWages = 0.00;
        var weekSalary = parseFloat(salary) || 0.00;
        var overtime = 0.00;

        if (payRate && hours) {
          if (parseFloat(hours) > 40) {
            regularWages = 40 * parseFloat(payRate);
            var ot = (parseFloat(hours) - 40) * 1.5;
            overtime = (ot * parseFloat(payRate));
          } else {
            regularWages = parseFloat(hours) * parseFloat(payRate);
          }
        }
      }

      var today = new Date();
      today.setDate(today.getDate() - (today.getDay() + 7));
      var yr = today.getFullYear();
      var thisWeek = String(today).split(yr)[0] + yr;

      // Collect the details about this paycheck.
      var payrollItem = {
        employee: name,
        total_hours: parseFloat(hours).toFixed(2),
        wages: regularWages.toFixed(2),
        salary: weekSalary.toFixed(2),
        overtime: overtime.toFixed(2),
        week_of: thisWeek
      };

      duckburg.requests.createNewObject('dbPayrollItem', payrollItem,
        function(result) {
          // created apayroll item.
      });

      // Create a ledger item.
      var totalPaycheck = parseFloat(regularWages) + parseFloat(weekSalary) +
          parseFloat(overtime);

      if (totalPaycheck && totalPaycheck > 0) {
        var checkName = name + ' ' + duckburg.utils.formatDate(today);
        var ledgerItem = {
          amount: totalPaycheck.toFixed(2),
          ledger_item_date: today,
          name: checkName,
          type: 'expense',
          visible: true
        };

        duckburg.requests.createNewObject('dbLedgerItem', ledgerItem,
          function(liResult) {
            // Created ledger item.
        });
      }

      $('.payrollSubmitLoading').show();
      setTimeout(function() {
        $('.payrollSubmitLoading').hide();
        duckburg.utils.hidePopup();
        duckburg.finances.loadPayroll();
      }, 5000);
    });
  },

  /**
   * Ledger loading functions
   * @module that loads ledger items.
   *
   */
  ledger: {

    /** Ledger balance. **/
    balance: function() {
      var bal = parseFloat(duckburg.utils.getOneCookie('balance')).toFixed(2);
      $('#bankBalanceDiv').val('$' + bal);
      duckburg.finances.ledger.available();
    },

    /** Ledger buttons **/
    buttons: function() {

      // Append buttons to this menu.
      $('.ledgerMainButtons')
        .html('')

        // Add income button.
        .append($('<label>')
          .attr('class', 'addIncomeButton')
          .html('<i class="fa fa-money"></i> add income')
          .click(function() {
            duckburg.finances.addDialog('income');
          }))

        // Add income button.
        .append($('<label>')
          .attr('class', 'addExpenseButton')
          .html('<i class="fa fa-money"></i> add expense')
          .click(function() {
            duckburg.finances.addDialog('expense');
          }))
     },

     /** Load the expenses **/
     expenses: function() {
       duckburg.finances.ledger.appendLedgerItems(
         'expense', 'ledgerExpensesHolder');
     },

     /** Load the expenses **/
     incoming: function() {
       duckburg.finances.ledger.appendLedgerItems(
          'income', 'ledgerIncomeHolder');
     },

     /** Get and append the ledger items **/
     appendLedgerItems: function(type, className) {

       // Update the ledger validator so that we know these results do
       // not yet exist.
       duckburg.finances.ledgerItemsAreLoaded[type] = false;

       // Load the new available balances.
       duckburg.finances.ledger.available();

       // Clear the expenses ledger.
       $('.' + className)
        .html('')
        .append($('<em>')
          .attr('class', 'loadingMessage')
          .html('loading ledger items'));

       // Load the expenses.
       duckburg.requests.findLedgerItems(type, function(results) {

           // Clear the div.
           $('.' + className)
             .html('');

           // No results message
           if (!results || results.length == 0) {
             var noResultsMessage = type == 'income' ?
                'no incoming items to show' : 'no expenses to show';

             $('.' + className)
               .append($('<em>')
                 .attr('class', 'noResultsMessage')
                 .html(noResultsMessage));
           }

           for (var i = 0; i < results.length; i++) {
             var result = results[i].attributes;

             // Skip invisible items.
             if (!result.visible) {
               continue;
             }
             var amount = result.amount;
             var name = result.name;
             var date = duckburg.utils.formatDate(result.ledger_item_date);
             var method = result.method || '(no method)';
             $('.' + className)
             .append($('<span>')
               .attr('id', results[i].id)
               .attr('name', type)
             .append($('<label>')
               .html(date))
             .append($('<label>')
               .html(method))
             .append($('<label>')
               .html(name))
             .append($('<label>')
               .html('$' + parseFloat(amount).toFixed(2)))
             .append($('<button>')
               .html('<i class="fa fa-times"></i>')
               .click(function(e) {
                 duckburg.finances.destroyLedgerItem(e);
               }))
           );
         }

         // Let the view know that this type of ledger item is loaded.
         duckburg.finances.ledgerItemMemory[type] = results;
         duckburg.finances.ledgerItemsAreLoaded[type] = true;

       });
     },

     /**
      * Load available balances
      * @function that projects balance out for the next several days.
      *
      */
     available: function() {

       // Check if income and expense items are available.  If they are still
       // being fetched, we'll wait.
       var hasIncome = duckburg.finances.ledgerItemsAreLoaded['income'];
       var hasExpenses = duckburg.finances.ledgerItemsAreLoaded['expense'];
       if (hasIncome && hasExpenses) {

         // Get the income, expense and available variables.
         var income = duckburg.finances.ledgerItemMemory['income'];
         var expenses = duckburg.finances.ledgerItemMemory['expense'];
         var balance = $('#bankBalanceDiv').val();
         var available = parseFloat(balance.replace('$', ''));

         // Update available balance.
         for (var i = 0; i < expenses.length; i++) {
           if (expenses[i].attributes.visible) {
             var expenseAmt = parseFloat(expenses[i].attributes.amount);
             available -= expenseAmt;
           }
         }
         $('#availableBalanceDiv').val('$' + available.toFixed(2));

         // Update cash & checks.
         for (var i = 0; i < income.length; i++) {
           var incomeItem = income[i].attributes;
           if (!incomeItem.visible) {
             continue;
           }
           if (incomeItem.method == 'cash' || incomeItem.method == 'check') {
             var incomeAmt = parseFloat(incomeItem.amount);
             available += incomeAmt;
           }
         }
         $('#checksAndCashInput').val('$' + available.toFixed(2));

         // Calculate future availability.
         var futureAvailability = {};
         for (var i = 0; i < income.length; i++) {
           var incomeItem = income[i].attributes;
           if (!incomeItem.visible) {
             continue;
           }
           if (incomeItem.method != 'cash' && incomeItem.method != 'check') {

             // Determine how much income will be available in the coming days.
             var date;
             if (incomeItem.method == 'card') {
               date = duckburg.utils.addDaysToDate(
                  incomeItem.ledger_item_date, 1);
             } else if (incomeItem.method == 'stripe') {
               date = duckburg.utils.addDaysToDate(
                 incomeItem.ledger_item_date, 2);
             } else {
               date = duckburg.utils.addDaysToDate(
                 incomeItem.ledger_item_date, 1);
             }

             // If income claims it will be available Sat or Sun, push it to
             // Monday when we will actually receive it.
             if (date.getDay() == 0) {
               date.setDate(date.getDate() + 1);
             } else if (date.getDay() == 6) {
               date.setDate(date.getDate() + 2);
             }

             // Format the date as a string.
             date = duckburg.utils.formatDate(date);
             // Create a dictionary showing how much income we'll be seeing
             // from the current set of items.
             if (futureAvailability[date]) {
               futureAvailability[date] += parseFloat(incomeItem.amount);
             } else {
               futureAvailability[date] = parseFloat(incomeItem.amount);
             }
           }
         }

         // Clear the available income projections.
         $('.availableFundsProjections').html('');

         // Start with today's date.
         var startDate = new Date();

         // Get the next week's worth of days so we can see what the balance
         // will likely be.
         for (var j = 0; j < 7; j++) {

          // Incremement day.
          startDate.setDate(startDate.getDate() + 1);
          if (startDate.getDay() == 6) {
            startDate.setDate(startDate.getDate() + 2);
          } else if (startDate.getDay() == 0) {
            startDate.setDate(startDate.getDate() + 1);
          }

          // Format the date so we can check for it in the dictionary.
          var formattedDate = duckburg.utils.formatDate(startDate);

          // Declare variable for amount, which will end up as a string.
          var amt;

          // Add the the available total and create a message for the
          // future projection div entry.
          if (futureAvailability[formattedDate]) {
            amt = parseFloat(futureAvailability[formattedDate]);
            available += amt;
            amt = '+ $' + amt.toFixed(2);
          } else {
            amt = 'no change';
          }

          // Display the next 7 days, the amount that the available funds will
          // increase (or a message that it won't) and the resulting balance.
          var dayOfWeek = duckburg.utils.dayDict[startDate.getDay()];
          $('.availableFundsProjections')
            .append($('<span>')
              .append($('<label>')
                .html(dayOfWeek))
              .append($('<label>')
                .html(amt))
              .append($('<label>')
                .html('$' + available.toFixed(2)))
             );
         }
       } else {
         setTimeout(function() {
           duckburg.finances.ledger.available();
         }, 500)
       }
     }
  },

  /**
   * Load the payroll view.
   * @function that gives an overview of payroll history.
   * @param date Object js date, from which to start
   *
   */
  loadPayroll: function(date) {

    // Clear the div.
    $('.finances').html('');

    // Get the next four weeks and fill an object.
    duckburg.finances.payrollObject = {};
    var validWeeks = [];
    date = date || new Date();
    date.setDate(date.getDate() - (date.getDate() + 14));
    var curMonth = date.getMonth();

    // Keep this date global.
    duckburg.finances.currentPayrollDate = date;
    var stringDate = String(date).split(String(date.getFullYear()))[0] +
        date.getFullYear();
    validWeeks.push(stringDate);

    // Create entries for the interesting weeks of payroll.
    for (var i = 0; i < 3; i++) {
      date.setDate(date.getDate() + 7);
      stringDate = String(date).split(String(date.getFullYear()))[0] +
          date.getFullYear();
      validWeeks.push(stringDate);
    }

    // Store the weeks from newest to oldest.
    for (var w = validWeeks.length - 1; w >= 0; w--) {
      var week = validWeeks[w];
      duckburg.finances.payrollObject[week] = [];
    }

    // Go fetch the payroll items.
    var DbObject = Parse.Object.extend('dbPayrollItem');
    var query = new Parse.Query(DbObject);

    // Make sure we are only getting the statuses we want.
    query.containedIn("week_of", validWeeks);

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        duckburg.finances.loadPayrollResultsToDictionary(results);
      },
      error: function(result, error) {
        var errorMsg = 'Error gettting payroll items.: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Handles the results from a payroll query.
   * @function that takes a list of payroll items and oragnizes them for display.
   *
   */
  loadPayrollResultsToDictionary: function(payrollItems) {

    $('.finances')
      .append($('<button>')
        .attr('class', 'launchPayrollButton')
        .html('start payroll')
        .click(function() {
          duckburg.finances.doPayroll();
        }))
      .append($('<div>')
        .attr('class', 'payrollRecapHolder'));

    for (var i = 0; i < payrollItems.length; i++) {
      var pi = payrollItems[i].attributes;
      if (duckburg.finances.payrollObject[pi.week_of]) {
        duckburg.finances.payrollObject[pi.week_of].push(pi)
      }
    }
    for (var arr in duckburg.finances.payrollObject) {

      $('.payrollRecapHolder')
        .append($('<div>')
          .attr('class', 'payrollRecapColumn')
          .append($('<h1>')
            .html(arr))
          .append($('<span>')
            .attr('class', 'payrollRecapColumnLegend')
            .append($('<label>')
              .html('name'))
            .append($('<label>')
              .html('wages'))
            .append($('<label>')
              .html('salary'))
            .append($('<label>')
              .html('overtime'))
            .append($('<label>')
              .html('total')))
          .append($('<span>')
            .attr('class', 'payrollRecapColumnItems')
            .attr('id', 'payrollRecapColumnItems_' + arr.replace(/ /g, '')))
        );


      var prDictList = duckburg.finances.payrollObject[arr];
      prDictList = duckburg.utils.sortDict(prDictList, 'employee');
      var weeksTotal = 0;

      for (var j = 0; j < prDictList.length; j++) {
        var emp = prDictList[j];

        // Get the total.
        var total = (parseFloat(emp.overtime) + parseFloat(emp.wages) +
            parseFloat(emp.salary)).toFixed(2);
        weeksTotal += parseFloat(total);
        var total = total == 0.00 ? '<em>$' + total + '</em>' : '$' + total;

        // Get wages.
        var wages = parseFloat(emp.wages).toFixed(2);
        if (emp.wages == 0.00) {
          wages = '<em>$' + wages + '</em>';
        } else {
          wages = '$' + wages;
        }

        // Get overtime.
        var overtime = parseFloat(emp.overtime).toFixed(2);
        if (emp.overtime == 0.00) {
          overtime = '<em>$' + overtime + '</em>';
        } else {
          overtime = '$' + overtime;
        }

        // Get salary.
        var salary = parseFloat(emp.salary).toFixed(2);
        if (emp.salary == 0.00) {
          salary = '<em>$' + salary + '</em>';
        } else {
          salary = '$' + salary;
        }

        $('#payrollRecapColumnItems_' + emp.week_of.replace(/ /g, ''))
          .append($('<label>')
            .html('<b>' + emp.employee + '</b>'))
          .append($('<label>')
            .html(wages))
          .append($('<label>')
            .html(salary))
          .append($('<label>')
            .html(overtime))
          .append($('<label>')
            .html(total));
      }

      if (weeksTotal != 0) {
        $('#payrollRecapColumnItems_' + emp.week_of.replace(/ /g, ''))
          .append($('<div>')
            .attr('class', 'weeksTotal')
            .html('Total for period: $' + weeksTotal.toFixed(2)))
      }
    }
  },

  /**
   * Load the taxes.
   * @function that gets sales tax information.
   *
   */
  loadTaxes: function() {

    // Initialize a blank tax payment object.
    duckburg.finances.existingTaxPayments = {};

    // Look for existing tax payments.
    var DbObject = Parse.Object.extend('dbLedgerItem');
    var liQuery = new Parse.Query(DbObject);

    // Match type.
    liQuery.matches('name', 'taxpayment');

    // Perform the queries and continue with the help of the callback functions.
    liQuery.find({
      success: function(results) {
        for (var i = 0; i < results.length; i++) {
          var payment = results[i].attributes;
          var name = payment.name;
          var amt = payment.amount;
          if (duckburg.finances.existingTaxPayments[name]) {
            duckburg.finances.existingTaxPayments[name] += parseFloat(amt);
          } else {
            duckburg.finances.existingTaxPayments[name] = parseFloat(amt);
          }
        }
        duckburg.finances.setUpTaxDisplay();
      },
      error: function(error) {
        var errorMsg = 'Error gettting ledger items: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Set up the tax view display.
   * @function that sets up tax view and requests database items.
   *
   */
  setUpTaxDisplay: function() {
    // Set up the div.
    $('.finances')
      .html('')
        .append($('<div>')
        .html('loading tax information')
        .attr('class', 'loadingTaxesMessage'));

    duckburg.requests.findOrders(['completed'], 'due_date', 'dsc', false,
      function(results) {

        if (!results || results.length == 0) {
          // Set up the div.
          $('.finances')
          .html('')
          .append($('<div>')
          .html('no orders to load')
          .attr('class', 'loadingTaxesMessage'));

          return;
        }

        // Handle results if they exist.
        duckburg.finances.handleResultsAndCalculateTaxes(results);
      });
  },

  /**
   * Handle results for a tax query.
   * @function take a list of completed orders and display sales tax info.
   * @param orders Object list of orders from Parse
   *
   */
  handleResultsAndCalculateTaxes: function(orders) {

    // Set object for the tax results.
    var taxesObject = {};

    // Go over orders and assemble an object.
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      var o = order.attributes;

      // Get the date.
      var month = duckburg.utils.monthDict[o.due_date.getMonth()];
      var year = o.due_date.getFullYear();
      var dateString = String(month).toLowerCase() + String(year).toLowerCase();
      var displayString = month + ' ' + year;

      // Check for taxes object.
      if (!taxesObject[dateString]) {

        // Create the object if it does not exist.
        taxesObject[dateString] = {
          taxable_order_totals: 0,
          taxable_order_payments: 0,
          tax_for_month: 0,
          tax_payments_made: 0,
          balance_due: 0,
          display_string: displayString
        };
      }

      // Get the order summary and perform the math.
      var summary = o.order_summary || '{}';
      summary = JSON.parse(summary);

      // Alias for object.
      var obj = taxesObject[dateString];
      obj.taxable_order_totals += parseFloat(summary.final_total);
      obj.taxable_order_payments += parseFloat(summary.payments);

      // Calculate and assign tax.
      var taxes = parseFloat(obj.taxable_order_payments * 0.06);
      obj.tax_for_month = taxes;
      obj.balance_due = taxes;
    }

    // Render tax information
    duckburg.finances.renderSalesTaxSummaries(taxesObject);
  },

  /**
   * Render the results of the sales tax calculations.
   * @function using results, render a sales tax page.
   * @param months Object containing key value pairs with a month as the key
   *        eg 'december2014' and a value that is also an object, which contains
   *        the tax summary for the month.
   *
   */
  renderSalesTaxSummaries: function(months) {

    // Clear the div.
    $('.finances')
      .html('');

    // Iterate over the info and display it.
    for (var month in months) {

      var info = months[month];

      if (duckburg.finances.existingTaxPayments[month + 'taxpayment']) {
        var pymnts =
            duckburg.finances.existingTaxPayments[month + 'taxpayment'];
        info.tax_payments_made += parseFloat(pymnts);
        info.balance_due = info.tax_for_month - info.tax_payments_made;
      }

      $('.finances')
        .append($('<div>')
          .attr('class', 'salesTaxMonth')

          .append($('<h1>')
            .html(info.display_string)
            .append($('<button>')
              .html('make payment')
              .attr('id', month)
              .click(function(e) {

                duckburg.finances.addDialog('expense');
                var id = e.currentTarget.id;
                $('#name').val(id + 'taxpayment');
              })))

          .append($('<span>')
            .append($('<em>')
              .html('Month\'s completed order totals: '))
            .append($('<label>')
              .html('$' + info.taxable_order_totals.toFixed(2)))
          )

          .append($('<span>')
            .append($('<em>')
            .html('Month\'s total revenue on orders: '))
            .append($('<label>')
            .html('$' + info.taxable_order_payments.toFixed(2)))
          )

          .append($('<span>')
            .append($('<em>')
            .html('Taxes for month: '))
            .append($('<label>')
            .html('$' + info.tax_for_month.toFixed(2)))
          )

          .append($('<span>')
            .append($('<em>')
            .html('Payments made on taxes: '))
            .append($('<label>')
            .html('$' + info.tax_payments_made.toFixed(2)))
          )

          .append($('<span>')
            .append($('<em>')
            .html('Balance due: '))
            .append($('<label>')
            .html('$' + info.balance_due.toFixed(2)))
          )
        );
    }
  }
};
