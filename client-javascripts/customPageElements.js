// Global duckburg namespace.
var duckburg = duckburg || {};

/**
* @module Models for custom page elements.
*
*/
duckburg.customPageElements = {

    elements: {

      /** Plain paragraph element **/
      plain_paragraph_element: {
        display_name: 'Text only paragraph',
        nest_inside: false,
        structure: {
          paragraph_1: {
            tag: '<p>',
            class_name: 'retailSite--paragraph',
            form_element: 'textarea',
            form_class: 'full',
            placeholder: 'A simple paragraph with text only.'
          }
        }
      },

      /** Two column element **/
      two_column_element: {
        display_name: 'Two column paragraph',
        nest_inside: {
          '<div>': 'retailSite--twoColumnHolder'
        },
        structure: {
          paragraph_1: {
            tag: '<p>',
            class_name: 'retailSite--twoColumnHolder__column',
            form_element: 'textarea',
            form_class: 'half',
            placeholder: 'A simple paragraph with text only.'
          },
          paragraph_2: {
            tag: '<p>',
            class_name: 'retailSite--twoColumnHolder__column',
            form_element: 'textarea',
            form_class: 'half',
            placeholder: 'A simple paragraph with text only.'
          }
        }
      },

      /** Three column element **/
      three_column_element: {
        display_name: 'Three column element',
        nest_inside: {
          '<div>': 'retailSite--threeColumnHolder'
        },
        structure: {
          paragraph_1: {
            tag: '<p>',
            class_name: 'retailSite--threeColumnHolder__column',
            form_element: 'textarea',
            form_class: 'third',
            placeholder: 'A simple paragraph with text only.'
          },
          paragraph_2: {
            tag: '<p>',
            class_name: 'retailSite--threeColumnHolder__column',
            form_element: 'textarea',
            form_class: 'third',
            placeholder: 'A simple paragraph with text only.'
          },
          paragraph_3: {
            tag: '<p>',
            class_name: 'retailSite--threeColumnHolder__column',
            form_element: 'textarea',
            form_class: 'third',
            placeholder: 'A simple paragraph with text only.'
          }
        }
      }
    },


    /** Load samples of all the elements. **/
    loadSample: function() {
      for (var element in duckburg.customPageElements.elements) {
        var details = duckburg.customPageElements.elements[element];

        // Creating a heading describing this element.
        $('#customPageSample')
          .append($('<h1>')
          .attr('class', 'sampleHeader')
          .html(details.display_name));

        // Sometimes the custom page elements need to be nested within a parent.
        if (details.nest_inside) {

          // Define the parent.  This loop will only run once.
          var parent;
          for (var tag in details.nest_inside) {
            var className = details.nest_inside[tag];
            parent = $(tag)
              .attr('class', className);

            // Append the parent.
            $('#customPageSample').append(parent);
          }

          // Loop over elements and append to the parent.
          for (var item in details.structure) {
            var el = details.structure[item];
            parent
              .append($(el.tag)
                .attr('class', el.class_name)
                .html(duckburg.customPageElements.sample_content));
          }

        } else {

          // Non-nested elements just get appended.
          for (var item in details.structure) {
            var el = details.structure[item];
            $('#customPageSample')
              .append($(el.tag)
                .attr('class', el.class_name)
                .html(duckburg.customPageElements.sample_content));
          }
        }
      }
    },

    sample_content: 'Normally, both your asses would be dead as fucking\
        fried chicken, but you happen to pull this shit while I\m in a\
        transitional period so I don\'t wanna kill you, I wanna help you.\
        But I can\'t give you this case, it don\'t belong to me. Besides,\
        I\'ve already been through too much shit this morning over this case\
        to hand it over to your dumb ass.'
};
