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

