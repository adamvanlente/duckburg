// Global duckburg namespace.
var duckburg = duckburg || {};

/**
* @module creates the finances page.
*
*/
duckburg.finances = {

  /** Default finance mode **/
  defaultView: 'ledger',

  /**
   * Load the finances page.
   * @function that loads the main view for finances.
   * @param mode String mode to start in
   *
   */
  load: function(mode) {

    // Get mode.
    mode = mode || duckburg.finances.defaultView;

    // Set menu.
    duckburg.finances.setMenu(mode);

    // Load the selected mode functions.
    if (mode == 'ledger') {
      duckburg.finances.loadLedger();
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
        .attr('class', 'ledgerBankBalance'))

      // Area that summarizes Balance, income, expenses and future funds
      .append($('<div>')
        .attr('class', 'ledgerSummaryArea'))

      // All expenses
      .append($('<div>')
        .attr('class', 'ledgerExpenses'))

      // All income
      .append($('<div>')
        .attr('class', 'ledgerIncome'))

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
        .attr('id', type)

        // Add form fields.
        .append($('<input>')
          .attr('id', 'amount')
          .attr('type', 'text')
          .attr('placeholder', type + ' amount'))
        .append($('<input>')
          .attr('id', 'name')
          .attr('type', 'text')
          .attr('placeholder', type + ' name'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'ledger_item_amount')
          .val(today)))

      // Append a button for form submission.
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
    duckburg.utils.addHighsmithCalendars(['ledger_item_amount'], true);
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
      type: type
    }

    // Assign the amount, etc.
    for (var i = 0; i < params.length; i++) {
      var input = params[i];
      obj[input.id] = input.value;
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
    });

  },

  /**
   * Ledger loading functions
   * @module that loads ledger items.
   *
   */
  ledger: {

    /** Ledger buttons **/
    buttons: function() {

      // Append buttons to this menu.
      $('.ledgerMainButtons')
        .html('')

        // Add income button.
        .append($('<label>')
          .attr('class', 'addIncomeButton')
          .html('add income')
          .click(function() {
            duckburg.finances.addDialog('income');
          }))

        // Add income button.
        .append($('<label>')
          .attr('class', 'addExpenseButton')
          .html('add expense')
          .click(function() {
            duckburg.finances.addDialog('expense');
          }))

        // Add income button.
        .append($('<label>')
          .attr('class', 'addPayrollButton')
          .html('payroll')
          .click(function() {
            duckburg.finances.doPayroll();
          }));
     }
  }


};
