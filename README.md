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
- [config.js] create a visible object entry, if desired (optional, makes it available for editing)
- [config.js] create a constant containing all form fields
- [forms.js] create function that loads form
- [forms.js] create function that validates form
- [forms_common.js] add logic in generic function to save object, which calls validating function
- [requests.js] add simple function to requests for creating/updating item
- (+)[requests.js] some objects will require custom logic like customers
- Create an initial object and set permissions on it

** These two items are technically optional.  Omitting them will simply mean the only way to create or list items is in Parse UI.


possible objects
- stock levels. pulls from catalog items, looks for available sizes, and allows you to check stock.
- activity log (this can live in create/update of objects, just log what's happening, current user, etc.)
- supplies, for internal monitoring order etc (perhaps these are just products?)
- object to handle names/numbers/etc
- explore how to represent social orders.  probably just done with isPrivate/isIndexed/ and product family


possible pages
- order page (order eg order to supplier)
  - shows all pending orders
	- these orders can be marked as 'waiting to order' or 'ordered' or 'received', sending them to printing
	- shipments - when an order is shipped, create a log in shipments so it is easier to find.
