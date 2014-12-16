// Global duckburg namespace.
var duckburg = duckburg || {};

/**
* @module Allows user to create pages for retail sites
*
*/
duckburg.pageMaker = {

  /** Holder for stores. **/
  currentStores: {},

  /** Currently viewing store **/
  currentlyViewingStore: undefined,

  /**
   * Main loading function for page maker.
   * @function that delegates the tasks for page maker view.
   *
   */
  load: function() {

    // Load a popup with instructions.
    // duckburg.utils.showPopup();
    // $('#popupContent')
    //   .attr('class', 'pageMakerPopupMessage')
    //   .html('Select a store from the blue menu to start building pages')
    //   .append($('<span>')
    //     .html('ok')
    //     .click(function() {
    //       duckburg.utils.hidePopup();
    //     }));

    // Load the page maker header.
    duckburg.pageMaker.loadHeader();

    // Empty out the left menu and body.
    $('.pageMakerMenu').html('');
    $('.pageMakerBody').html('');
  },

  /**
   * Load the header for the page maker view.
   * @function that populates a menu with every available store.
   *
   */
   loadHeader: function() {
    duckburg.requests.findObjects('dbStoreSettings', false, function(results) {

      // Clear the header.
      $('.pageMakerHeader').html('');

      for (var i = 0; i < results.length; i++) {

        // Define each store.
        var store = results[i];

        // Hold stores in memory.
        duckburg.pageMaker.currentStores[store.id] = store;

        // Get store name.
        var storeName = store.attributes.store_name;

        // Create a header link for each store.
        $('.pageMakerHeader')
          .append($('<span>')
          .attr('id', store.id)
          .html(storeName)
          .click(function(e) {
            var id = e.currentTarget.id;
            duckburg.pageMaker.loadStore(id);
          }));
      }
    });
  },

  /**
   * Load a store for the page maker.
   * @function that gets the details about a store, and sets up the ui to
   *           allow the user to create pages/edit settings.
   * @param id String parse id of object.
   *
   */
  loadStore: function(id) {

    // Get the current store settings.
    var storeSettings = duckburg.pageMaker.currentStores[id];
    duckburg.pageMaker.currentlyViewingStore = storeSettings;

    // Get store name.
    var storeName = storeSettings.attributes.store_name;

    // Load empty message for editor/body.
    duckburg.pageMaker.emptyEditorMessage();

    // Load the stores side/left menu.
    $('.pageMakerMenu')
      .html('')
      .append($('<h1>')
        .html(storeName))

      // Page title element.
      .append($('<span>')
        .append($('<label>')
          .html('page title'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editStoreTitle();
          })))

      // Page meta keywords.
      .append($('<span>')
        .append($('<label>')
          .html('meta keywords'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editMetaKeywords();
          })))

      // Page meta description.
      .append($('<span>')
        .append($('<label>')
          .html('meta description'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editMetaDescription();
          })))

      // Fixed header link
      .append($('<span>')
        .append($('<label>')
          .html('header'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editStoreHeader();
          })))

      // Main page fixed content.
      .append($('<span>')
        .append($('<label>')
          .html('main body'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editStoreHomepageBody();
          })))

      // Fixed footer link
      .append($('<span>')
        .append($('<label>')
          .html('footer'))
        .append($('<em>')
          .html('edit')
          .click(function() {
            duckburg.pageMaker.editStoreFooter();
          })))

      // Custom pages header and holder.
      .append($('<h2>')
        .html('custom pages')
        .append($('<button>')
          .html('<i class="fa fa-plus-square"></i>')
          .click(function() {
            duckburg.pageMaker.newCustomPage();
          })))
      .append($('<div>')
        .attr('class', 'customFormElements'))

      // Append a shortcut link to preview sample custom page elements.
      .append($('<a>')
        .attr('href', '/customPageSamples')
        .attr('target', 'new')
        .html('custom page samples'));

      // Load the custom page list.
      duckburg.pageMaker.loadListOfCustomPages();
  },

  /**
   * Load the custom page list
   * @function looks for custom pages for the current store and loads the list.
   *
   */
  loadListOfCustomPages: function() {

    // Get store.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var s = store.attributes;

    // Clear the holder.
    $('.customFormElements').html('');

    // Create a menu item for each custom page.
    var cp = s.custom_pages || {};
    for (var page in cp) {
      $('.customFormElements')
        .append($('<span>')
          .append($('<label>')
            .html(page))
          .append($('<em>')
            .attr('class', 'editEm')
            .attr('id', page)
            .html('edit')
            .click(function(e) {
              var page = e.currentTarget.id;

              // Edit the page.
              duckburg.pageMaker.editCustomPage(page);
            }))
          .append($('<em>')
            .attr('class', 'deleteEm')
            .attr('id', page)
            .html('delete')
            .click(function(e) {
              duckburg.pageMaker.confirmDeletePage(e);
            })));
    }
  },

  /**
   * Confirm the removal of a page.
   * @funciton prompts the user to confirm or cancel deletion of a page.
   * @param e Object click event from delete button.
   *
   */
  confirmDeletePage: function(e) {

    // Get page.
    var page = e.currentTarget.id;
    duckburg.pageMaker.pageToDelete = page;

    // Show the popup.
    duckburg.utils.showPopup();

    // Create a popup so that the user can confirm.
    $('#popupContent')
      .attr('class', 'pageMakerDeletePagePopup')
      .html('Delete this page? For reals?')

      // Cancel button.
      .append($('<button>')
        .attr('class', 'cancelButton')
        .html('cancel')
        .click(function() {
          duckburg.utils.hidePopup();
        }))

      // Confirm deletion of page.
      .append($('<button>')
        .html('submit')
        .attr('class', 'submitButton')
        .click(function() {

          // Get current store.
          var store = duckburg.pageMaker.currentlyViewingStore;
          var s = store.attributes;

          // Remove page and update the Parse object.
          delete s.custom_pages[duckburg.pageMaker.pageToDelete];
          duckburg.pageMaker.currentlyViewingStore.save().then(
            function(result) {
              var msg = 'Deleted page.';
              duckburg.utils.successMessage(msg);
              duckburg.pageMaker.loadListOfCustomPages();
              duckburg.utils.hidePopup();
            },
            function(error) {
              var err = 'Error deleting page';
              duckburg.utils.errorMessage(err);
            }
          )
        })
     );
  },

  /**
   * Edit the Title for the store (html page title)
   * @function that launches the Title editor.
   *
   */
  editStoreTitle: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the header editing elements.
    duckburg.pageMaker.setEditorHeader('Edit store title', 'store_title');

    // Set the required editor elements.
    var elements = {
      'store_title': {
        type: 'input',
        placeholder: 'Enter the store title (title for html/browser tab).'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing header if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var st = store.attributes.store_title || {};
    var body = st.store_title || '';
    $('#store_title').val(body);
  },

  /**
   * Edit the meta keywords
   * @function that launches the Title editor.
   *
   */
  editMetaKeywords: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the header editing elements.
    duckburg.pageMaker.setEditorHeader('Edit meta keywords', 'meta_keywords');

    // Set the required editor elements.
    var elements = {
      'meta_keywords': {
        type: 'input',
        placeholder: 'Enter a comma separated list of meta keywords.'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing header if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var mk = store.attributes.meta_keywords || {};
    var body = mk.meta_keywords || '';
    $('#meta_keywords').val(body);
  },

  /**
   * Edit the meta description
   * @function that launches the meta description editor.
   *
   */
  editMetaDescription: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the header editing elements.
    duckburg.pageMaker.setEditorHeader(
        'Edit meta description', 'meta_description');

    // Set the required editor elements.
    var elements = {
      'meta_description': {
        type: 'textarea',
        placeholder: 'Enter a comma separated list of meta description.'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing header if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var mk = store.attributes.meta_description || {};
    var body = mk.meta_description || '';
    $('#meta_description').val(body);
  },

  /**
   * Edit the header details for a store.
   * @function that launches the header editor.
   *
   */
  editStoreHeader: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the header editing elements.
    duckburg.pageMaker.setEditorHeader('Edit header', 'header');

    // Set the required editor elements.
    var elements = {
      'header_body': {
        type: 'textarea',
        placeholder: 'Enter the header html in this area.'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing header if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var header = store.attributes.header || {};
    var body = header.header_body || '';
    $('#header_body').val(body);
  },

  /**
   * Edit the header details for a store.
   * @function that launches the header editor.
   *
   */
  editStoreHomepageBody: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the body editing elements.
    duckburg.pageMaker.setEditorHeader('Edit page body', 'homepage_body');

    // Set the required editor elements.
    var elements = {
      'homepage_body': {
        type: 'textarea',
        placeholder: 'Enter the hompage html in this area.'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing homepage body if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var hp = store.attributes.homepage_body || {};
    var body = hp.homepage_body || '';
    $('#homepage_body').val(body);
  },

  /**
  * Edit the footer details for a store.
  * @function that launches the footer editor.
  *
  */
  editStoreFooter: function() {

    // Clear the body.
    $('.pageMakerBody').html('');

    // Add the header editing elements.
    duckburg.pageMaker.setEditorHeader('Edit footer', 'footer');

    // Set the required editor elements.
    var elements = {
      'footer_body': {
        type: 'textarea',
        placeholder: 'Enter the footer html in this area.'
      }
    };
    duckburg.pageMaker.setEditorElements(elements);

    // Append form buttons.
    duckburg.pageMaker.setEditorButtons(duckburg.pageMaker.submitEditorForm);

    // Set an existing header if it exists.
    var store = duckburg.pageMaker.currentlyViewingStore;
    var footer = store.attributes.footer || {};
    var body = footer.footer_body || '';
    $('#footer_body').val(body);
  },

  /**
   * Set the heading for the editor
   * @function sets a title in the editing area regarding what is being edited.
   * @param string String message for heading.
   * @param name String name for header, which will become element's name
   *
   */
  setEditorHeader: function(string, name) {
    // Form heading
    $('.pageMakerBody')
      .append($('<h1>')
        .attr('class', 'pageMakerEditorHeading full')
        .attr('id', 'pageMakerEditorHeading')
        .attr('name', name)
        .html(string));
  },

  /**
   * Set editor elements
   * @function that takes a set of key value pairs and creates form elements.
   * @param elements Object key:value pairs of element_name:{type, placeholder}.
   *
   */
  setEditorElements: function(elements) {
    for (var elementName in elements) {
      var el = elements[elementName];
      var type = el.type;
      var placeholder = el.placeholder;
      if (type == 'textarea') {
        $('.pageMakerBody')
          .append($('<textarea>')
            .attr('id', elementName)
            .attr('class', el.form_class + ' full')
            .attr('name', 'pageMakerEditorFormElement')
            .attr('placeholder', placeholder));
      } else {
        $('.pageMakerBody')
          .append($('<input>')
            .attr('id', elementName)
            .attr('type', type)
            .attr('class', el.form_class)
            .attr('name', 'pageMakerEditorFormElement')
            .attr('placeholder', placeholder));
      }
    }
  },

  /**
   * Set editor buttons.
   * @function sets buttons within the editor.
   *
   */
  setEditorButtons: function(submitFunction) {

    // Create a span with buttons inside of it.
    $('.pageMakerBody')
      .append($('<span>')
        .attr('class', 'buttonsSpan')
        .append($('<button>')
          .html('cancel')
          .attr('class', 'cancelButton')
          .click(function() {
            duckburg.pageMaker.emptyEditorMessage();
          }))
        .append($('<button>')
          .html('submit')
          .attr('class', 'submitButton')
          .click(function() {
            submitFunction();
          }))
      );
  },

  /**
   * Set an empty editor message.
   * @function set a message in the editor when it is empty.
   * @param msg String message for message holder.
   *
   */
  emptyEditorMessage: function(msg) {

    // Set message.
    msg = msg || 'use the menu to the left to edit page elements.';

    // Append message to div.
    $('.pageMakerBody')
      .html('')
      .append($('<span>')
        .attr('class', 'emptyEditorMessage')
        .html(msg));
  },

  /**
   * Submit an editor form
   * @function collects values from a form and submits them.
   *
   */
   submitEditorForm: function() {

     // Get the element's name.
     var elementName = $('#pageMakerEditorHeading').attr('name');

     // Set the new element.
     var formElements = {};

     // Get the elements.
     $('[name="pageMakerEditorFormElement"]').each(function() {
       var el = $(this);
       var id = el.attr('id');
       var val = el.val();
       formElements[id] = val;
     });

     // Set the content to the object.
     duckburg.pageMaker.currentlyViewingStore.set(elementName, formElements);
     duckburg.pageMaker.currentlyViewingStore.save().then(
       function(result) {
         var msg = 'Element updated.';
         duckburg.utils.successMessage(msg);
         duckburg.pageMaker.emptyEditorMessage();
       },
       function(error) {
         var err = 'Unable to edit element: ' + error.message;
         duckburg.utils.errorMessage(err);
       });
   },

   /**
    * New custom page
    * @function creates popup that allows user to create a new custom page.
    *
    */
   newCustomPage: function() {

     // Show the popup.
     duckburg.utils.showPopup();

     // Populate the popup.
     $('#popupContent')
       .attr('class', 'newCustomPagePopup')
       .append($('<input>')
         .attr('type', 'text')
         .attr('id', 'new_page_name')
         .attr('placeholder', 'custom page name, eg faq, about-us, etc'))

       .append($('<button>')
         .html('cancel')
         .attr('class', 'cancelButton')
         .click(function() {
           duckburg.utils.hidePopup();
         }))
       .append($('<button>')
         .html('submit')
         .attr('class', 'submitButton')
         .click(function() {

           // New page name
           var newPageName = $('#new_page_name').val();
           var isReservedPath =
              duckburg.utils.reservedRoutes.indexOf(newPageName) != -1;
           if (!newPageName || newPageName == '' || isReservedPath) {
             var blankMsg = 'New page must have a name.';
             duckburg.utils.errorMessage(blankMsg);
             return;
           }

           // Get store.
           var store = duckburg.pageMaker.currentlyViewingStore;
           var s = store.attributes;

           // Get custom pages
           var customPages = s.custom_pages || {};
           if (customPages[newPageName]) {
             var pageExistsMsg = 'A custom page with this name exists already.';
             duckburg.utils.errorMessage(pageExistsMsg);
             return;
           } else {
             customPages[newPageName] = {};
           }

           duckburg.pageMaker.currentlyViewingStore.set(
              'custom_pages', customPages);
           duckburg.pageMaker.currentlyViewingStore.save().then(
             function(result) {
               var successMsg = 'New page created';
               duckburg.utils.successMessage(successMsg);
               duckburg.pageMaker.loadListOfCustomPages();
               duckburg.utils.hidePopup();
             },
             function(error) {
               var err = 'Error creating new page: ' + error.message;
               duckburg.utils.errorMessage(err);
             })

         })
      );
   },

   /**
    * Edit a custom page's details.
    * @function that presents the user with the ability to edit a custom page.
    * @param page String name of page.
    *
    */
   editCustomPage: function(page) {

     // Clear body.
     $('.pageMakerBody').html('');

     // Set the header.
     var msg = 'Edit custom page: ' + page;
     duckburg.pageMaker.setEditorHeader(msg, page);

     // Add title and meta inputs.
     $('.pageMakerBody')
       .append($('<input>')
         .attr('type', 'text')
         .attr('id', 'custom_page_title')
         .attr('placeholder', 'Page title'))

       .append($('<input>')
         .attr('type', 'text')
         .attr('id', 'custom_meta_keywords')
         .attr('placeholder', 'Page meta keywords'))

       .append($('<input>')
         .attr('type', 'text')
         .attr('id', 'custom_meta_description')
         .attr('placeholder', 'Page meta description'));

     // Element-Adder form.
     duckburg.pageMaker.createCustomPageElementAdder(page);

     // Get any existing elements.
     duckburg.pageMaker.popuplateExistingElements(page);
   },

   /**
    * Create Element Adder
    * @function that creates an element that allows user to add elements
    *           to their custom page.
    * @param page String page name to edit
    *
    */
   createCustomPageElementAdder: function(page) {

     // Current page for memory.
     duckburg.pageMaker.currentlyUpdatingPage = page;

     // Create a select menu.
     $('.pageMakerBody')
       .append($('<select>')
         .attr('class', 'pageMakerElementAdderSelectMenu')
         .attr('id', 'customPageElementSelect')
         .change(function(e) {
           var val = e.currentTarget.value;
           duckburg.pageMaker.appendBlankCustomElementToForm(val);
           e.currentTarget.selectedIndex = 0;
         }));

     // Append a 'title' option to the select menu.
     var option = document.createElement('option');
     option.text = 'select a page element to add';
     option.value = 'none';
     var select = document.getElementById('customPageElementSelect');
     select.appendChild(option);

     // Create an option for each custom page element.
     for (var page in duckburg.customPageElements.elements) {
       var obj = duckburg.customPageElements.elements[page];
       var cpOption = document.createElement('option');
       cpOption.text = obj.display_name;
       cpOption.value = page;
       select.appendChild(cpOption);
     }

     // Append a div for all page elements.
     $('.pageMakerBody')
       .append($('<div>')
         .attr('class', 'customPageEditorElements')
         .attr('id', 'customPageEditorElements'));

     // Set editor buttons
     duckburg.pageMaker.setEditorButtons(
        duckburg.pageMaker.submitCustomElementForm);
   },

   /**
    * Append a blank custom element to a form.
    * @function that adds elements to a form for a custom page.
    * @param element String name of custom element
    *
    */
   appendBlankCustomElementToForm: function(element) {

     // Error handling.
     if (element == 'none' || !element || element == '') {
       return;
     }

     // Get the Custom Page Element (cpe).
     var cpe = duckburg.customPageElements.elements[element];
     duckburg.pageMaker.dispatchObjectToCreateCustomElement(cpe, element);
   },

   /**
    * Create a custom page element form element.
    * @function that creates a form element for a custom page element.  This
    *           function takes as an argument either an object describing a
    *           new element to be added, or an item that already exists in the
    *           custom page element structure.
    * @param obj Object that describes the structure of the element.
    * @param elementKey String key value for the element
    *
    */
   dispatchObjectToCreateCustomElement: function(obj, elementKey) {

     // Create a heading for the form element.
     duckburg.pageMaker.createCustomFormElementHeader(obj, elementKey);
   },

   /**
    * Create a heading for a custom form element
    * @function create a header for a custom form element that allows the user
    *           to give it a logical order and name, as well as remove it.
    * @param obj Object that defines the structure of the element.
    *
    */
   createCustomFormElementHeader: function(obj, keyName) {

      // Get a count of existing elements.
      var elCount = $('.customPageElementsHolder').length;

      // Get the index of the new element.  Existing items will contain an
      // index, but we'll assign indexes for new elements.
      var index = obj.index_in_list || elCount + 1;

      // Get the descriptive name user added.
      var descName = obj.desc_name || '';

      // Create a header for this element.
      var parentDiv = $('<div>')
        .attr('class', 'customPageElementsHolder')
        .attr('id', keyName);

      $('#customPageEditorElements').append(parentDiv);

      // Append the basic form elements.
      parentDiv
        .append($('<span>')
          .attr('class', 'customPageElementDescHeader')
          .attr('id', 'customPageElementDescHeader')

          // Input for index within list.
          .append($('<label>')
            .attr('class', 'indexLabel')
            .html('appears at'))
          .append($('<input>')
            .attr('type', 'text')
            .attr('id', 'index_of_item_' + elCount)
            .attr('class', 'indexInput')
            .val(index))

          // Type of element
          .append($('<label>')
            .attr('class', 'typeLabel')
            .html('type: ' + obj.display_name))

          // Allow the user to create a name for the element.
          .append($('<input>')
            .attr('type', 'text')
            .attr('class', 'nameInput')
            .attr('id', 'name_for_item_' + elCount)
            .attr('placeholder', 'Name this element (optional)')
            .val(descName))

          // Delete button.
          .append($('<button>')
            .html('delete')
            .click(function(e) {
              var parent = $(e.currentTarget).parent().parent();
              parent.remove();

              // Give a message explaining what happened.
              var msg = 'Deleted. Change will not take effect until you save.';
              duckburg.utils.successMessage(msg);
            }))
       );

       // Create the form elements for the object.
       duckburg.pageMaker.createBlankCustomFormElements(
          obj, keyName, parentDiv);
   },

   /**
    * Create the blank form elements for the new page element.
    * @function takes the custom page element object and makes form elements
    *           for all of its parameters.
    * @param obj Object custom page element object.
    * @param keyName String key for the object.
    * @param parent Object dom element to append to
    *
    */
   createBlankCustomFormElements: function(obj, keyName, parent) {

     // Iterate over the structure to find each element.
     for (var formElement in obj.structure) {
       var element = obj.structure[formElement];

       var val = '';
       if (obj.values && obj.values[formElement]) {
          val = obj.values[formElement];
       }

       if (element.form_element == 'textarea') {
         parent
           .append($('<textarea>')
             .attr('id', formElement)
             .attr('name', 'structureElement')
             .attr('class', element.form_class)
             .attr('placeholder', element.placeholder)
             .val(val));
       } else if (element.formElement == 'input') {
         parent
           .append($('<input>')
             .attr('id', formElement)
             .attr('name', 'structureElement')
             .attr('type', element.input_type)
             .attr('class', element.form_class)
             .attr('placeholder', element.placeholder)
             .val(val));
       }
     }
   },

   /**
    * Submit a form containing elements that comprise a custom page.
    * @function takes a custom page form and builds the structure to
    *           represent this custom page in the database.
    *
    */
   submitCustomElementForm: function() {

     // Holder for all page elements.
     var customPageElementsHolder = [];

     // Iterate over each element.
     $('.customPageElementsHolder').each(function(index) {

       // Get children of the element.
       var childElements = $(this).children();
       var type = this.id;

       // Create a new object for each item.
       var newObject = {};

       // Store its type, index, descriptive name and an empty values object.
       newObject.type = type;
       newObject.index_in_list = $('#index_of_item_' + index).val();
       newObject.desc_name = $('#name_for_item_' + index).val();
       newObject.values = {};

       // Store the key/value pairs for each element.
       for (var i = 0; i < childElements.length; i++) {
         var el = childElements[i];
         if (el.name == 'structureElement') {
           newObject.values[el.id] = el.value;
         }
       }

       // Get the rendered html string for the items.
       newObject.rendered_content =
          duckburg.pageMaker.getRenderedPageElement(newObject.values, type);

       // Push every object to the holder.
       customPageElementsHolder.push(newObject);
     });

     // Get title and meta info.
     var titleOfPage = $('#custom_page_title').val();
     var keywords = $('#custom_meta_keywords').val();
     var description = $('#custom_meta_description').val();

     // Get the current store and update its custom page data.
     var store = duckburg.pageMaker.currentlyViewingStore;
     var s = store.attributes;
     var customPages = s.custom_pages;
     var curPage = duckburg.pageMaker.currentlyUpdatingPage;

     // Set title and meta keywords/desc on the new object.
     customPages[curPage] = {};
     customPages[curPage].title = titleOfPage;
     customPages[curPage].meta_keywords = keywords;
     customPages[curPage].meta_description = description;

     // Set the new custom elements with Parse.
     customPages[curPage].elements = customPageElementsHolder;
     duckburg.pageMaker.currentlyViewingStore.set('custom_pages', customPages);

     // Save it on the server and notify user of results.
     duckburg.pageMaker.currentlyViewingStore.save().then(
       function(result) {
         var msg = 'Updated custom page.';
         duckburg.utils.successMessage(msg);
         duckburg.pageMaker.emptyEditorMessage();
       },
       function(error) {
         var err = 'Error saving page: ' + error.message;
         duckburg.utils.errorMessage(err);
       }
     );
   },

   /**
    * Creates a rendered version of a custom page element.
    * @function that takes a custom page element, looks up its structure
    *           within customPageElements.js and renders the actual html
    *           that will be seen and used by the client.
    * @param name String name of the item within the custom page element.
    * @param value String custom value being plugged in.
    * @param type String type of custom page element.
    *
    */
   getRenderedPageElement: function(values, type) {

     // Get the custom element description from the custom page elements
     // script.
     var cpe = duckburg.customPageElements.elements[type];
     var renderedContent = '';

     // Get all the elements for the custom page elment (and their values).
     for (var element in values) {

       // Value to place inside the page item.
       var value = values[element];

        // Get the intended structure of this element.
        var struct = cpe.structure[element];

        // Opening tag.
        renderedContent += '<' + struct.tag +
           ' class="' + struct.class_name + '">';

        // Insert value.
        renderedContent += value;

        // Closing tag.
        renderedContent += '</' + struct.tag + '>';
     }

     // Determine if this needs to be nested inside an element.
     if (cpe.nest_inside) {
       var parentTag;
       var parentClass;
       for (var parent in cpe.nest_inside) {
         parentTag = parent;
         parentClass = cpe.nest_inside[parent];
       }

       // Now insert the current rendered content into this parent element.
       renderedContent = '<' + parentTag + ' class="' + parentClass + '">' +
          renderedContent + '</' + parentTag + '>';
     }

     // Return the string containing rendered content.
     return renderedContent;
   },

   /**
    * Populate a custom page form with existing elements.
    * @function that take a custom page's info and fills a form for editing.
    * @param page String name of page
    *
    */
   popuplateExistingElements: function(page) {

     // Get the desired page elements from the current store.
     var store = duckburg.pageMaker.currentlyViewingStore;
     var s = store.attributes;
     var customPages = s.custom_pages;
     var curPage = customPages[page];
     var currentPageElements = curPage.elements;

     // Set the title and meta keywords/description.
     $('#custom_page_title').val(curPage.title);
     $('#custom_meta_keywords').val(curPage.meta_keywords);
     $('#custom_meta_description').val(curPage.meta_description);

     // Make a copy of the custom page element.
     for (var i = 0; i < currentPageElements.length; i++) {
       var element = currentPageElements[i];
       var type = element.type;

       // Create a new model for populating the elements.
       var newModel = {};

       // Get the standard model for the element type.
       var model = duckburg.customPageElements.elements[type];

       // Let the new model inherit all these properties.
       for (var param in model) {
         newModel[param] = model[param];
       }

       // Give the new model inherited properties from the saved version
       // of this custom form element.
       newModel.desc_name = element.desc_name;
       newModel.index_in_list = element.index_in_list;
       newModel.values = element.values;

       duckburg.pageMaker.createCustomFormElementHeader(newModel, type);
     }
   }
};
