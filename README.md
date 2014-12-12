## DuckBurg v2.0

Features to document

- How to report problems.

- signing in
  difference between signing in and punching in

- order list
  - order issues warnings
  - how 'updatedAt affects order (if you update an order it may shift downward)'
- creating orders
  - color count, how it works, how sleeves cost more, think of pant legs as sleeves
- payments
- invoices
- mastersearch
- print calendar (differences in modes)
  - cookie that sets current mode as default.
- daily order sheet
- objects concept / creating & updating objects
- names/numbers
- time clock
- user hours (past timeclock punches)
- github issues

admin features
- user management
- payroll
- taxes
  - how payments need to be names just so.
- ledger
  balance
  available = balance - exp
  cash & check = aavailable + cash & check
  projections
    cards clear in 1 day
    stripe in 2 days
    if not cash, check, card or stripe I assume it can be deposited, thus 1 day


in development features
- social orders
- partnership orders (do this from object creator... do not allow partnership orders from order page)

- customer feedback emails
- customer feedback forms
- look at order profit (by order and by list of orders)
- order delivery method (is order shipping)
- salespeople dashboard
- salespeople option on orders
- submitted orders

in dev admin features
- dashboard
- job applications


DESCISION POINTS
- what to do to help w/ shipping.  Take a look at my warning and come up with some rules about shipping, due date and print date.
- want to report issue for case when order == 'ordered' but is missing size info; there's a loophole when only one item is missing info that
  might not be critical (don't want to remove item, but no sizes right now.)  Should we force staff to remove the unused item, cater warning
  to different scenarios? hmmmm
