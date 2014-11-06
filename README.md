## DuckBurg

backend system for managing projects @ RetroDuck

### javascript

##### duckburg.js
duckburg.js, within client-javascripts, handles some global functions like error messages, initialization, etc.

##### Flow of objects

There are lots of objects in DuckBurg, such as customers, orders, files, etc. Each of these have some common properties/methods.  These utilize the other javascript files.  Each Object has:

- A form
	- forms.js handles the launching & initilization for forms forms for all objects.  For instance, If an object exists for customers, there will be a form that can be launched to create/edit records for this object.
	- forms.js also handles any global functions belonging to all forms in duckburg.
- A set of requests
	- requests.js handles requests for creating/updating an object.
	- this file also handles <b>special conditions</b> for different objects.  For instance, when creating customers it is beneficial to determine if the customer already exists in the system.
- A list view
	- (views.js) each object will have a list view, where the user can view all available objects and update them (based on their user role).
	- views.js also handles one addition thing, which is displaying a global view that lists all objects and their available functions, much like an api explorer.

#### Steps to creating a new object flow in the UI

- create the jade form template
- add jade template to index.jade
- [config.js] create a visible object entry, if desired (optional, makes it available for editing)
- [config.js] create a constant containing all form fields
- [forms.js] create function that loads form
- [forms.js] create function that validates form
- (if there is a date input, be sure to attach a CAL in forms_listeners.js)
- [forms_common.js] add logic in generic function to save object, which calls validating function
- [requests.js] add simple function to requests for creating/updating item
- [views.js] create a loading function for viewing the list of items
- (+)[requests.js] some objects will require custom logic like customers

- Create an initial object and set permissions on it (log in to Parse to do so)

** These two items are technically optional.  Omitting them will simply mean the only way to create or list items is in Parse UI.


possible objects
- stock levels. pulls from catalog items, looks for available sizes, and allows you to check stock.
- supplies, for internal monitoring order etc (perhaps these are just products?)
  NOTE: names nums, should provide method to submit csv contents for adding
- explore how to represent social orders.  probably just done with isPrivate/isIndexed/ and product family
- timepunch object.  users will punch in/out.  When they punch out, it will look for the newest punch in for their user account, and calculate their hours based on that.
- PAYMENTS, need to incorporate once orders have been established.  Payment module only available from order?  Perhaps just a payment module that allows you to search for orders as well.
- ORDER TYPES (standard, social, partnership)


!! Can I make routes in a database, then iterate over them in Express to create new routes?
// EG, let users create routes from Parse, then create them on the fly?  This would allow for custom
// routes to social orders.

possible pages
- order page (order eg order to supplier)
  - shows all pending orders
	- these orders can be marked as 'waiting to order' or 'ordered' or 'received', sending them to printing
	- shipments - when an order is shipped, create a log in shipments so it is easier to find.
