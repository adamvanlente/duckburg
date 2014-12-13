// Global duckburg namespace.
var duckburg = duckburg || {};

/**
* @module that lets users add and manage assets.
*
*/
duckburg.assets = {

  /**
   * Loads the main asset view.
   * @function that provides a file input for uploading files.
   *
   */
   load: function() {

     // Clear the main div.
     $('.assetListUploader').html('');

     // Create the image upload input.
     duckburg.assets.createImageUploader();

     // Create the search input.
     duckburg.assets.createSearchBar();

     // Set the empty message to the results.
     duckburg.assets.setEmptySearchMessage();
   },

   /** Create a search bar. **/
   createSearchBar: function() {

     // Append the search bar.
     $('.assetListSearch')
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'assetListSearchBar')
         .attr('id', 'assetListSearchBar')
         .attr('placeholder', 'search assets')
         .keyup(function(e) {
            duckburg.assets.performSearch(e);
         }));
   },

   /** Create an image upload input. **/
   createImageUploader: function() {

      // Add a file input
      $('.assetListUploader')

         // Name for file.
         .append($('<input>')
           .attr('type', 'file')
           .attr('class', 'fileUploader')
           .attr('id', 'assetListFileUploader')

           // Give the image picker an onchange function.
           .change(function(e) {
             var nameArray = String(e.currentTarget.value).split('\\');
             var name = nameArray[nameArray.length - 1];

             // Using the input, upload the file that's been selected.
             var file = event.currentTarget;

             duckburg.requests.saveFileFromInput(file, function(result, input) {

               // Get the url and set up the object.
               var url = result._url;
               var params = {
                 image_name: name,
                 image_url: url,
                 parse_search_string: name
               };

               // Create a new image asset.
               duckburg.requests.createNewObject('dbImageAsset', params,
                 function(result) {
                   var msg = 'File uploaded.';
                   duckburg.utils.successMessage(msg);
                 })
             });
          })
       );
   },

   /** Perform an asset search. **/
   performSearch: function(event) {

     // Clear an interval if it exists.
     if (duckburg.assets.searchTimeout) {
       window.clearInterval(duckburg.assets.searchTimeout);
     }

     // Search term.
     var term = event.currentTarget.value;

     if (!term || term == '') {

       duckburg.assets.setEmptySearchMessage();
       return;
     }


     // Perform the search after a split second.
     duckburg.assets.searchTimeout = setTimeout(function() {

        //  Set the empty message to the results.
        $('.assetList')
          .html('')
          .append($('<span>')
            .attr('class', 'loadingMessage')
            .html('searching for: ' + term));


       duckburg.requests.findObjects('dbImageAsset', term.toLowerCase(),
          function(results) {

           // Case for no results.
           if (!results || results.length == 0) {
             $('.assetList')
               .html('')
                 .append($('<span>')
                   .attr('class', 'noResultsMessage')
                   .html('no items match that search term.'));
             return;
           }

           // Handle the results.
           duckburg.assets.handleSearchResults(results);
         });
     }, 180)
   },

   /** Handle the returned results. **/
   handleSearchResults: function(results) {

     // Clear the div.
     $('.assetList').html('');

     // Create an etry for every result.
     for (var i = 0; i < results.length; i++) {
       var result = results[i].attributes;
       var image = result.image_url;

       $('.assetList')
         .append($('<div>')
           .attr('class', 'resultsDiv')
           .append($('<label>')
              .attr('id', image)
              .css({'background': 'url(' + image + ') #fff',
                    'background-color': '#fff',
                    'background-size': '100%'})
              .click(function(e) {

                // Show the image to the user on click.
                var img = e.currentTarget.id;
                duckburg.utils.revealImageViewerWithImage(img);
              }))
           .append($('<em>')
             .html(result.image_name))
           .append($('<input>')
             .attr('type', 'text')
             .val(image))
          );
     }
   },

   /** Set an empty search message when no search is happening. **/
   setEmptySearchMessage: function() {
     //  Set the empty message to the results.
     $('.assetList')
       .html('')
       .append($('<span>')
         .attr('class', 'loadingMessage')
         .html('upload files, or enter a search term in the left menu.  ' +
               'Images for site blocks should have square dimensions, and' +
               ' slider images should be ' +
               duckburg.utils.desiredSliderImageDimensions + ' pixels'));
   }
};
